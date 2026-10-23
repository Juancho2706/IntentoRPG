# Paso 4 · Rework de ítems, inventario y stats — diseño

> **Estado:** diseño **v4.2** (22-oct-2026). Sobre la v4.1 (que atendía las 13 objeciones altas que no habían llegado a la mesa, §13.0), corrige las **4 que la verificación marcó INSUFICIENTE** (INV-B-1, R1-B-2, R1-B-3 y R2-B-4) y sus notas menores (§13.0b). **Las decisiones de §3 y las 12 preguntas de §14 siguen aprobadas por el dueño** (22-oct); la v4.2 añade **3 recomendaciones nuevas** en §14 (mientras no digas otra cosa, vale la recomendada). No toca código.
> **Aviso honesto:** las 13 objeciones altas quedan con su estado final en `refutaciones/trazabilidad-altas.md` (sección «Tras la verificación»). La corrección de R1-B-3 sacó a la luz un **hallazgo alto nuevo**: frente al banco de hoy, el típico de la v4 rinde **×0,67–0,73 de DPS y ×0,50–0,54 de Aguante en el Nv50** y el óptimo, ×0,26–0,57; lo ancla la regla nueva **IT0** (§10). Siguen **sin atender 167 objeciones de gravedad media o baja** (lista en `refutaciones/no-vistas.md`; textos íntegros en `refutaciones/*.json`). La pasada a medias de `paso4-items-diseno.v5-parcial.md` no vale como versión.
> **Autor:** diseñador líder del Paso 4. **Insumos:** `investigacion/arpg.md`, `ux.md` y `actual.md` (v2, refutados); el diseño del cooperativo `../paso6-multijugador/paso6-multijugador-diseno.md`; lectura del código en `paso2-impl` (4095ab6); búsquedas y lecturas web de octubre de 2026 (§15); y el modelo analítico propio **v4.2** (`calc-r2.mjs`: tablero corregido, crítico por especialización, sobrecrítico, paridad por eje y por especialización, IT3 y perfil «hoy» del banco; `calc-r2-econ.mjs` sin cambios; marcados [D]), que reproduce las fórmulas del código y da los números de esta versión (salida en `out-r2.txt` y `out-r2-econ.txt`).
> **Mockup:** `mockup/index.html` (v4: inventario con veredicto «a potencial», Herrería con **Afinar**, aspectos solo en 6 ranuras, ritmo con el oro como única moneda de la Herrería). **No se actualizó a la v4.1 ni a la v4.2**: lo que quedó atrás está al final de `refutaciones/trazabilidad-altas.md`. La v3 (`mockup/index.v3.bak.html`, `paso4-items-diseno.v3.bak.md`) no está en esta carpeta.
> **Qué manda.** Este documento fija el **sistema, los contratos y el orden**. Los números son **de partida** y salen del modelo [D]: los cierra el banco en la etapa E4 de este paso (constantes de ítems) y después la calibración E4b (clases).
> **Marcas:** [V] verificado en fuente primaria o en el código · [S] fuente secundaria · [D] deducción o modelo propio · [M] a medir en el banco.

---

## 0. Resumen

1. **Tres ejes visibles por pieza:** ◆ **NO** (nivel de objeto + rango de mejora), **rareza** (cuántas líneas y si trae aspecto) y **◇ engarce** (una línea que eliges con una gema). **El valor de una línea depende solo del ◆**: dos piezas con el mismo ◆, las mismas líneas y los mismos pasos valen lo mismo, y un ◆ mayor siempre vale más (§4.2).
2. **La rareza solo decide líneas y aspecto.** Desaparece `statMult`. El arma conserva al raro de hoy con `GEAR_K = 1,69` sobre la media; el héroe entero no (sin la sopa de afijos de hoy, el típico del Nv50 rinde ≈ 0,7 de DPS y ≈ 0,5 de Aguante), y por eso **IT0 ancla el poder a hoy** antes de calibrar nada: implícitos para el Nv50 y la vida y el daño de los enemigos de AL 41–50 para el resto (§10).
3. **Seis ranuras llevan aspecto** (arma, mano izquierda, guantes, amuleto y los 2 anillos); las **cuatro armaduras** (casco, pecho, cinturón y botas) son de stats, con **Vida y Armadura implícitas** que crecen con el ◆, y se persiguen por su ◆, sus pasos, la ★, la gema y los Únicos. Con 12–14 aspectos útiles por configuración para 6 ranuras, **elegir aspectos es una decisión de build**, no una eliminación (§4.6).
4. **Aspectos que cambian habilidades del Paso 2,** con el vocabulario `fx` de los talentos: 36 de especialización (4 × 9; las dos «V» de una especialización nunca son variantes de la misma habilidad), 12 de clase (todos útiles en las 3 barras recomendadas) y 6 universales.
5. **Nada queda muerto al cambiar de manos** y **ninguna línea es un impuesto:** el Principal solo está en el arma y los guantes y va a `mainGear` (solo daño); la Vida sale sobre todo del implícito; «% Daño de tu elemento» se cambia por **«% daño de tus ‹categoría›»** (básicos, gastadoras o Insignia), que sí obliga a decidir.
6. **Presupuesto con unidad y paridad medida:** cada línea queda a ±20 % de la mediana de su eje **dentro de su especialización** (IT6; el daño crítico, con afinidad declarada a ±50 %) y de las demás de **su pool medido en ⚡** (IT6b). Las líneas con tope salen en pocas ranuras; el crítico vive solo en los anillos. **La probabilidad de crítico se topa en 60 %, pero lo que sobra no se pierde: hace más fuertes tus críticos (sobrecrítico)**, así que ninguna línea de crítico muere aunque una especialización pase de 60 con sus talentos (la Francotiradora llega a 62,8 % y el Rayo del Arcanista a 71,8 % con el óptimo, §4.4).
7. **Una sola valoración** (`js/valuation.js`) y **una sola regla de veredicto**, que ahora también mira **a potencial**: lo que cae se compara con tu pieza a **igual inversión** (mismo rango, tu gema movida, tu aspecto regrabado y **los pasos que ya afinaste**). Si solo gana así, la celda lleva un martillo ⚒ y el tooltip dice cuánto cuesta (§6).
8. **Economía que no se satura:** la Herrería cobra **solo oro**; el Polvo es del Códice y las Chispas, del Mítico. **Afinar** (subir el paso de una línea con un dado; nunca baja) es el sumidero que crece: la 3.ª línea de una pieza cuesta ~14 veces la 1.ª. Sin marca de agua. Metas: build funcional **2–4 h**, completa **12–20 h**, techo **40–60 h** (§4.13).
9. **Se funden o se van:** la Calidad pasa al ◆, las gemas al engarce ◇ y la Esencia **no llega a existir**. Las reliquias pasan a Únicos, los Míticos se rehacen (**solo uno activo**), los glifos son **uno de cada tipo**, y el Códice y el alijo pasan a la cuenta. Runas, palabras rúnicas, charms, conjuntos, encantadora y cubo **se retiran**.
10. **Preparado para el cooperativo en navegador:** almacén de cuenta **por reino**, cerrojo entre pestañas, `validateItem` y **`validateLoadout`** comunes con el saneado del Paso 6, regalos con transferencia en dos fases, `heroId` en la migración v6 y botín por `killLootRng`. No se implementa red en este paso.

**El tooltip, en una imagen** (≤ 9 filas; números del mockup v4 para el Berserker Nv72, calculados con el crítico de talentos de la v4, +5; con el +10 de la v4.1 y el crítico condicional del Berserker de la v4.2 cambian las cifras y el mockup no se rehízo):

```
✦ Hoja del Ocaso                      ⚔  ◆45 ◔        ← glifo y color de rareza · ranura · ◆ con anillo de mejora (3/5)
▲▲ Daño +27,6 %  ▼ Aguante −3,2 %                    ← Δ⚡ +14,2 %: ▲▲ porque g ≥ 10 % y g ≥ 2·|−3,2 %|
⚔ 65–97 · 1,30/s                                      ← implícito (◆45 = ilvl 42 + 3 rangos)
• +6 Fuerza                          ▰▰▰▰▰             ← «Principal» resuelto para quien mira (va a mainGear)
• +39,8 % daño crítico               ▰▰▰▰▰★            ← ★ = afijo mayor (paso 6)
• +9,0 % vel. de ataque              ▰▰▰▱▱
◇ Topacio · +6,5 % daño              ▰▰▰▰▱             ← la línea que eliges (vacía = ◌)
◈ Molino: el 3.er giro deja un sangrado del 40 % · r3  ← aspecto; sin la variante: atenuado + «Pide: Molino»
```

Y cuando solo gana tras invertir (Guantes de Ónice, ◆47 recién caídos, con sus 3 líneas ya al paso 5, frente a tus guantes ◆49 con ★ y Esmeralda; como sus pasos no son peores que los tuyos, no hace falta afinar):

```
≈ Daño −2,5 %  Aguante −0,9 %
⚒ ▲ tras mejorar · Daño +4,5 % · Aguante +1,5 % · mejorar a ◆52 · mover tu Esmeralda · 15 900 oro
```

Si el candidato trae pasos peores que los que ya afinaste, la fila suma el coste de afinarlos (v4.2, §6): `⚒ ▲ tras mejorar y afinar · Daño +… · Aguante +… · mejorar a ◆52 · afinar 2 líneas (≈ 10 tiradas) · ≈ 128 000 oro (1 h)`.

---

## 1. Objetivos y cómo se miden

| # | Objetivo | Medida | Dónde se comprueba |
|---|---|---|---|
| O1 | **Botín emocionante y legible** | ≤ 9 filas de tooltip (+1 fila ⚒ si aplica); 3 superposiciones por celda; ≥ 1 legendario cada ~140 comunes en T0 por caída con un 85 % de aspectos de tu clase; sonido, haz y etiqueta para Legendario+. **La escasez que se mide es la de aspectos y rangos nuevos** (IT7): como Grabar copia tu Códice sobre un Raro (§4.11), tras ≈ 10–12 h un legendario que cae vale su Polvo y su aspecto o rango **si es nuevo**, y la persecución pasa a la base (◆, líneas y pasos), los Únicos y los Míticos | `test101-tooltip`, `loot-bench` |
| O2 | **Sinergia con el Paso 2** | Cada especialización tiene ≥ 4 aspectos que tocan su kit, su forja o su indicador; **sus dos «V» piden variantes de habilidades distintas**; los 4 de clase sirven en las 3 barras recomendadas | `test-aspects-<clase>`, regla F10 |
| O3 | **Decisión de aspectos** | En **cada combinación de variantes** de las 6 habilidades de la barra de la especialización (≤ 3⁶ = 729; la forja recomendada no fija todas las variantes), cada una de las 6 ranuras con aspecto tiene **≥ 3 candidatos útiles** y hay **más candidatos que ranuras** (≥ 9 para 6) | `test-aspects-cobertura` |
| O4 | **Endgame de crafteo** | Mejora con remate ★, re-tirada dirigida, **Afinar**, grabado, Míticos con techo fijo | `test98-crafteo` |
| O5 | **Sin sopa de stats** | 16 líneas; 0 líneas muertas (ninguna combinación legal deja una línea en 0; el crítico por encima de 60 tampoco: sobrecrítico); paridad por especialización (IT6) y por pool en ⚡ (IT6b) | `test92`, IT3, IT6, IT6b |
| O6 | **Cuota de poder del equipo fijada y anclada a hoy** | Líneas sobre blancos con implícito — DPS: 20–30 % (típico Nv20), 30–40 % (Nv50), 40–50 % (Nv70), 50–60 % (óptimo Nv100); Aguante: 30–40 %, 40–50 %, 45–55 %, ≤ 65 %. **Ancla absoluta (v4.2):** el típico del Nv50 rinde lo mismo que hoy ±10 % en DPS y en Aguante, y del Nv58 al 100 el TTK y el TTD del típico quedan a ±15 % del banco de hoy | reglas IT0 e IT1 |
| O7 | **Una sola verdad de «mejor»** | Veredicto (ahora y a potencial), ▲, orden, ⚡ y banco salen de `valuation.js` con **una sola regla**; ningún hover cambia `hp`/`mp`; el ⚡ crece con el nivel | `test95-valoracion` |
| O8 | **Guardados que sobreviven** | v5 → v6 sin perder objetos de valor; los aspectos van al Códice; idempotente; `heroId` y `accountId` creados | `test97-guardado-v6` con saves reales |
| O9 | **Ritmo conocido y sin saturación** | Metas en horas (2–4 / 12–20 / 40–60 h); la apuesta da ≤ ½ de las bases por ranura y hora que matar; el oro sin gastar nunca pasa de 2 h de ingresos con la política de gasto del banco | regla IT7 de `loot-bench` |

---

## 2. Principios (reglas de fondo)

1. **Tres ejes visibles por pieza** (◆, rareza, ◇). El resto (★, rango del aspecto, gema, paso) es una **marca dentro** de un eje.
2. **El ◆ es el potencial.** El valor de una línea es función del ◆ (y de su paso y su peso), no de cómo se llegó a ese ◆. Así «◆ más alto» siempre significa «mejor a igualdad de líneas» (el contrato del ilvl de WoW [S]).
3. **Regla de inversión.** Lo barato se pierde (la mejora cuesta ~1/6 de hora de oro por pieza); lo caro (Afinar, ★) se hace en piezas finales, como el masterworking de D4; lo que no se pierde vive en la cuenta (Códice) o se recupera (gemas, aspecto regrabado).
4. **Nada muerto al cambiar de manos.** Toda línea se resuelve para quien la lleva y **solo** hace lo que dice.
5. **Una sola valoración** y **una sola regla de veredicto**, que compara a igual inversión.
6. **El ítem habla el idioma de los talentos.** Los aspectos son `fx` con rango; lo nuevo va por `definePower`, nunca por un `if` en combate (`CLAUDE.md`).
7. **Cada número tiene una hora:** fuentes y sumideros por hora, medidos por `loot-bench`.
8. **Cada moneda tiene un dueño y cada sumidero crece** (nuevo): oro = Herrería y apuesta; Polvo = Códice; Chispas = Mítico. Ningún recurso se queda sin uso marginal antes de la hora 60.

---

## 3. Decisiones grandes (✅ aprobadas por el dueño, 22-oct)

> **✅ Aprobada por el dueño (22-oct):** las 30, cada una con su opción recomendada. Lo que esta tabla marca con ✅ ya es la decisión. Un conflicto con una corrección posterior queda anotado en §13.0 (P4-D7, palabras rúnicas), sin cambiar la decisión. **v4.2:** ninguna decisión cambia; se corrigen las cifras del «Por qué» de P4-D21 y P4-D22 y se escribe el efecto de balance de P4-D2 que no se le había explicado al dueño (aviso en §14).

| ID | Pregunta | Opciones | Decisión (✅ Aprobada por el dueño, 22-oct) | Por qué |
|---|---|---|---|---|
| **P4-D1** | ¿Cuántas ranuras? | (a) 12, como hoy · (b) **10 al estilo D2** (sin hombreras ni pantalones) · (c) 10 al estilo D4 | **(b)** ✅ | Coincide con los iconos `eq_*` y deja menos piezas, más importantes |
| **P4-D2** | ¿`ILVL_MAX`? | (a) 50 o 57 · (b) 40 + capas (hoy) · (c) **47 = AL del Nv70** | **(c)** ✅ | Del Nv70 al 100 el progreso es horizontal (Afinar, ★, Míticos, tablero). **Efecto de balance (v4.2, R1-B-3):** hoy el equipo se congela en il40 desde el Nv58 mientras la vida enemiga crece ×1,84 hasta el AL47; con 47, el típico gana ×1,75–1,78 de DPS en ese tramo (el arma, ×1,55). Lo absorbe la tabla de enemigos `ENEMY_P4` de AL 41–50 que mide IT0 (§10), no las clases |
| **P4-D3** | ¿Qué hace la rareza? | (a) **Líneas + aspecto, sin multiplicador** · (b) multiplicador · (c) las dos (hoy) | **(a)** ✅ | Con (c) el legendario domina (≈ ×1,6) |
| **P4-D4** | ¿Cómo valen el ilvl y el rango? | (a) **El valor depende solo del ◆; cada rango es +1 ◆** (% y Principal ×1,035; planos ×1,065) · (a′) rango ×1,065 a todo e ilvl aparte (v3) · (b) eje aparte | **(a)** ✅ | En la v3 dos piezas con el mismo ◆ diferían hasta un 29 % y un ◆47 podía ganar a un ◆50 (refutación R2-1). Las % no usan G porque multiplican al arma, que ya escala con G: sería doble escala |
| **P4-D5** | ¿Atributos? | (a) **«Principal» adaptable en `mainGear`, solo en arma y guantes** · (b) botín inteligente · (c) 4 atributos | **(a)** ✅ | Sin efectos secundarios (v3) y sin impuesto: fuera de las armaduras (R2-5) |
| **P4-D6** | ¿Gemas? | (a) **La gema es la línea ◇** (solo encaja si su línea está en el pool; se quita gratis) · (b) engarces dentro del techo · (c) como hoy | **(a)** ✅ | Funde dos ejes; Rubí solo donde hay Vida al azar; Amatista solo en arma y guantes |
| **P4-D7** | ¿Runas, palabras rúnicas, charms y conjuntos? | (a) **Retirarlos** · (b) mantener · (c) Talismán ya | **(a)** ✅ | Cada uno es un eje más y ninguno escala |
| **P4-D8** | ¿Cómo se cambia una línea? | (a) **Re-tirar UNA línea elegida** (2 opciones o la tuya) · (b) templado · (c) encantadora al azar | **(a)** ✅ | Modelo de D4 y Titan Quest II; el paso se sube aparte con Afinar (P4-D28) |
| **P4-D9** | ¿Monedas? | (a) **Oro (Herrería y apuesta) + Polvo (Códice) + Chispas (Mítico)** · (a′) Esencia + Polvo + oro (v3) · (b) materiales por rareza | **(a)** ✅ | En la v3 Esencia y oro se pagaban siempre juntos: dos contadores para una sola decisión (R2-3) |
| **P4-D10** | ¿Rejilla? | (a) **1×1 de 10×4** · (b) dos tamaños · (c) D2/PoE | **(a)** ✅ | Sin Tetris en un cooperativo que no se pausa |
| **P4-D11** | ¿Identificar? | (a) **Automático, revelación animada en Legendario+** · (b) clic gratis · (c) pergaminos | **(a)** ✅ | Un clic sin decisión |
| **P4-D12** | ¿Hallazgo mágico? | (a) **Fuera de las líneas** · (b) línea · (c) quitarlo | **(a)** ✅ | No compite con el combate ni infla el ⚡ |
| **P4-D13** | ¿De quién es el Códice? | (a) **De la cuenta, por reino** · (b) de cada héroe | **(a)** ✅ | Lo caro vive en la cuenta; cada reino tiene el suyo |
| **P4-D14** | ¿Protección contra la mala suerte? | (a) **Polvo → aspecto elegido r1 y +1 rango; cofre «elige 1 de 3»; jefes de zona** · (b) contador oculto · (c) nada | **(a)** ✅ | Un aspecto concreto en ≤ 5 legendarios |
| **P4-D15** | ¿Bendiciones? | (a) **Tope en nivel 10; Ojo Certero → daño crítico** · (b) tope por grieta · (c) igual | **(a)** ✅ | Hoy una bendición de grieta 27 vale más que las líneas |
| **P4-D16** | ¿Nivel requerido? | (a) **Blando: ◆ efectivo** · (b) bloqueo · (c) nada | **(a)** ✅ | Sirve también para la sincronización |
| **P4-D17** | ¿⚡ Poder? | (a) **(D/D₁)^w·(A/A₁)^(1−w), referencia fija (desnudo Nv1) y w por rol** · (b) dos números | **(a)** ✅ | Crece con nivel, talentos y equipo; ▲ y ⚡ salen de la misma cuenta |
| **P4-D18** | ¿Comercio? | (a) **Sin comercio; regalo solo dentro del grupo** · (b) libre · (c) nada | **(a)** ✅ | Con guardado local nada es de fiar |
| **P4-D19** | ¿Mítico? | (a) **Línea libre fuera de combate + 4 Chispas → el que elijas; solo uno activo** · (b) solo de botín | **(a)** ✅ | D4 tiene vías deterministas y limita a un Mítico fabricado equipado [S] |
| **P4-D20** | ¿Pausa al abrir paneles? | (a) **En solitario sí; en cooperativo no** · (b) nunca · (c) siempre | **(a)** ✅ | |
| **P4-D21** | ¿Dónde vive el crítico? | (a) **Solo en los anillos** · (b) guantes y anillos con menos valor · (c) rendimientos decrecientes | **(a)** ✅ | Óptimo del Nv100 (v4.2, con el tablero bien contado y el crítico condicional de cada especialización): global 32,8 / 34,8 / 47,8 %, y en su estado normal hasta 62,8 % (Francotiradora) y 71,8 % (Rayo del Arcanista). Por eso lo que pase de 60 se convierte en crítico más fuerte (**sobrecrítico**, §4.4); (c) ya no hace falta |
| **P4-D22** | ¿De dónde sale la vida? | (a) **Vida implícita en las armaduras, con G(◆)** · (a′) compensación lineal en `hpPerLevel` (v3) · (b) todo a E4b | **(a)** ✅ | La lineal sobraba en el Nv20 y faltaba en el Nv100 (R2-5); la implícita crece con G como el daño enemigo. **v4.2:** la vida típica del Nv70 (1 610–1 730) no es «la de hoy»: la réplica del banco da hoy 1 820–1 890, y en el Nv50 994–1 071 frente a 1 415–1 547. El ancla absoluta la pone IT0 (§10) |
| **P4-D23** | ¿Almacén de cuenta? | (a) **Uno por reino** · (b) uno compartido con marca | **(a)** ✅ | Lo local no entra en la escalera por la puerta de atrás |
| **P4-D24** | ¿Categorías de aspecto? | (a) **5 (Ofensivo, Defensivo, Utilidad, Movilidad, Mecánica) repartidas en las 6 ranuras con aspecto; el amuleto, todas** · (b) 4 | **(a)** ✅ | Tabla en §4.6 |
| **P4-D25** | ¿Cuántas ranuras llevan aspecto? (nuevo) | (a) **6: arma, mano izq., guantes, amuleto y 2 anillos; armaduras de stats + Únicos** · (b) 10, con ≥ 6 aspectos de especialización y 6 de clase (≈ 78) | **(a)** ✅ | Con 10 ranuras y ~13 candidatos el BiS salía por eliminación (R2-2); con 6 hay ~13 para 6 y el contenido no crece (R7) |
| **P4-D26** | ¿Cuántas monedas paga la Herrería? (nuevo) | (a) **Solo oro** · (b) solo Esencia (y oro para el resto) | **(a)** ✅ | Un contador menos; el oro ya se recoge solo y tiene usos que compiten (Afinar, apuesta) |
| **P4-D27** | ¿Marca de agua? (nuevo) | (a) **Fuera** · (b) descuento real con tope semanal | **(a)** ✅ | Sin topes semanales el descuento no frena nada (en WoW se apoya en emblemas topados) [S] |
| **P4-D28** | ¿Cómo se sube el paso de una línea? (nuevo) | (a) **Afinar: dado 1–5, te quedas con el mayor; 3 500·1,3ᵐ** · (b) +1 paso fijo por precio · (c) nada | **(a)** ✅ | Sumidero que crece sin tope y no castiga (nunca baja). Divine Orb de PoE [S] |
| **P4-D29** | ¿Contra qué se compara lo que cae? (nuevo) | (a) **Ahora y a potencial (igual inversión), con ⚒** · (b) solo ahora (v3) | **(a)** ✅ | En el final del juego casi nada salía ▲ y el filtro tiraba las mejores bases (R2-4). v4.2: «igual inversión» incluye los pasos que ya afinaste (R2-B-4) |
| **P4-D30** | ¿Velocidad de movimiento? (nuevo) | (a) **Implícita de las botas (+10 %), fuera de las líneas** · (b) línea al azar (v3) | **(a)** ✅ | Como línea valía 0,3–0,4 de su pool en ⚡: era una trampa |

---

## 4. El sistema

### 4.1 Ranuras, bases e implícitos

**10 ranuras** (P4-D1). **Seis llevan aspecto** (◆ en el muñeco) y **cuatro son armaduras de stats** (P4-D25). La base fija el implícito y el icono, **sin tiradas invisibles** (fuera el ×0,85–1,15 de `items.js:205-219`).

| Ranura | Tipo | Peso | Implícito (fuera del techo; con G(◆)) | Pool (3 líneas al azar) |
|---|---|---|---|---|
| Arma | aspecto | 0,75 | Daño: **media = 3·G(◆)·1,69**, golpe ×0,8–1,2 | Principal · % Daño · % Daño de tus ‹cat› · % Daño crítico · % Vel. de ataque · Vida al golpear · **+1 a tus gastadoras** (◆ ≥ 36) |
| Mano izq. | aspecto | 0,75 | **Vida ×0,7** + escudo (Armadura ×1,3 y 10 % de bloqueo) · foco (+8 % de Recurso) · carcaj (+6 % de vel. de ataque) | % Reducción de daño · % Enfriamiento · Vida al golpear · (escudo) Armadura, Bloqueo · (foco y carcaj) % Recurso, % Daño de tus ‹cat› |
| Guantes | aspecto | 0,75 | Armadura ×0,7 · **Vida ×0,7** | Principal · % Daño · % Daño de tus ‹cat› · % Daño crítico · % Vel. de ataque |
| Amuleto | aspecto | 0,70 | — | % Daño · % Daño de tus ‹cat› · % Daño crítico · Vida · **+1 a tu Insignia, Definitiva o Movilidad** (◆ ≥ 36) |
| Anillo ×2 | aspecto | 0,5625 | — | % Daño · % Daño de tus ‹cat› · **% Crítico** · % Daño crítico · Vida · Vida al golpear |
| Casco | armadura | 1,00 | Armadura ×1 · **Vida ×1** | Vida · Armadura · % Enfriamiento · % Recurso · Esquiva |
| Pecho | armadura | 1,00 | Armadura ×1,5 · **Vida ×1,5** | Vida · Armadura · % Reducción de daño · % Recurso · Vida al golpear |
| Cinturón | armadura | 0,75 | Armadura ×0,7 · **Vida ×0,7** | Vida · Armadura · % Reducción de daño · % Recurso |
| Botas | armadura | 0,75 | Armadura ×1 · **Vida ×1** · **+10 % vel. de movimiento** | Vida · Armadura · Esquiva · % Recurso |

- **Vida implícita = 5,5 · G(◆) · multiplicador** (`K_HP`); armadura implícita = 2 · G(◆) · 1,25 · multiplicador (`GEAR_K_ARM`). Con un equipo típico del Nv70 (◆47) el implícito pone ≈ 560 de vida y las líneas y los Rubíes, ≈ 500 más.
- **El Principal ya no está en las armaduras** (solo arma y guantes, más la Amatista): las armaduras compiten solo entre 🛡 y ✚, y las líneas ⚔ entre sí (R2-5, R2-7).
- **Pools ≥ 4.** Si al re-tirar quedan menos de 2 líneas libres, la segunda opción es **la misma línea con otro paso** (§4.9).
- **El arma manda por su implícito:** `GEAR_K = 1,69` sobre la media conserva el arma del raro de hoy (`items.js:210-213`, `entities.js:914-916`) [V]; la armadura usa 1,25. Conservar el arma no conserva al héroe: el resto del equipo de hoy (12 ranuras con 4–5 afijos, los cuatro atributos en todas) pone mucho más, así que `GEAR_K`, `K_HP` y `GEAR_K_ARM` son también las palancas del ancla IT0 (§10).
- **Grupos exclusivos:** una línea no sale dos veces en una pieza; «% Daño de tus ‹cat›» sale una vez por pieza con un selector.
- **Armas y manos izquierdas son de clase** (hacha, bastón o arco; escudo, foco o carcaj). El escudo deja de detectarse por texto (`entities.js:43-45`): `kind: 'escudo'`.

### 4.2 ◆ NO: nivel de objeto + mejora

- **◆ = ilvl + rango de mejora (0–5).** Es el número que ves y **el que ordena el potencial**:
  - **valor de una línea = tope × s(◆) ⁄ s(52) × peso × f(paso)**, con `s = G` para las planas (Vida, Armadura, Vida al golpear) y **`s = 1,035^◆`** para las % y el Principal. `tope` es el valor con ◆52, paso 5 y peso 1 (§4.4).
  - **implícito** = su fórmula con G(◆).
  - Por eso **il42 r5 = il47 r0 = ◆47** en todas las líneas (`test92`: «mismo ◆, mismas líneas, mismos pasos ⇒ mismo valor»; el mockup lo comprueba: 6,441 = 6,441). Cada rango sube las % y el Principal ×1,035 (+19 % de r0 a r5) y lo plano ×1,065 (+37 %). En ◆6 (Nv1) una línea % vale el 20 % de su tope.
  - **Por qué 1,035 y no 1,065 en las %:** las % multiplican al arma, que ya crece con G(◆); con G también en las % el daño escalaría con G² y la cuota del equipo se dispararía con el nivel.
- **`ILVL_MAX = 47`** (P4-D2): ◆ máximo = 52.

  | Nv del héroe | 1 | 10 | 20 | 30 | 40 | 50 | 58 | 70 | 100 |
  |---|---|---|---|---|---|---|---|---|---|
  | AL (`areaLevelForHero`) | 1 | 9 | 19 | 25 | 30 | 36 | 40 | 47 | 50 |
  | ilvl que cae | 1 | 9 | 19 | 25 | 30 | 36 | 40 | **47** | 47 |
  | ◆ máx. con mejora | 6 | 14 | 24 | 30 | 35 | 41 | 45 | 52 | 52 |

- **Tormento:** el botín cae con rango **⌊T/4⌋** (T10 → r2; la v3 daba r5 y vaciaba el sumidero). Cada escalón de T mueve un **2 % de los pasos 1–2 al paso 5** (T0: 20 % de pasos 5; T10: 40 %) y da un **0,5 % de ★ al caer** (T10: 5 %). Es la recompensa vertical por dificultad (D4 sube la probabilidad de Míticos y afijos mayores con el Tormento [S]).
- **Remate al rango 5:** ★ (paso 6, ×1,5 del paso 5) en una línea al azar; se puede **mover** con oro, cada vez más caro (§4.9).
- **Sin marca de agua** (P4-D27). La de WoW es un descuento sobre emblemas con tope semanal (50 % de Flightstones en Dragonflight S2; por umbrales en TWW) [S]; aquí, sin topes, solo abarataba y no frenaba nada.
- **◆ efectivo** (nivel requerido blando, P4-D16): en solitario, `◆ efectivo = mín(ilvl, ilvl de tu nivel + 2) + rango`. El tooltip lo enseña como «◆45 ⇣38».
- **Perfil de sincronización** (cooperativo con un compañero de menos nivel; escalera). Con `NOz` = ◆ máximo de la zona:

  | Pieza | En sincronización | Por qué |
  |---|---|---|
  | ◆ | `mín(◆, NOz + 2)` | con el valor función del ◆, esto es exacto |
  | ★ | cuenta como paso 5 | el ×1,5 no se recorta con el ◆ |
  | ◇ gema | grado ≤ 1 + ⌊NOz / 13⌋ | FFXIV desactiva la materia al sincronizar [V en `arpg.md`]; aquí se topa |
  | Aspecto | rango ≤ 1 + ⌊NOz / 13⌋ | |
  | +1 rango del equipo | desactivado si NOz < 40 | |
  | Mítico | poder activo; sus líneas, al ◆ efectivo y al paso 5 | |
  | Bendiciones | nivel ≤ ⌊NOz / 5⌋ | |

  `test-sync`: un óptimo Nv100 sincronizado a ◆20 rinde ≤ 1,15× un típico de ese nivel en Daño y en Aguante.

### 4.3 Rarezas

| Rareza | Glifo | Líneas al azar | ◇ | Aspecto o poder | Cae desde | Papel |
|---|---|---|---|---|---|---|
| Común (blanco) | ○ | 0 | sí | — | solo AL < 15 | base de los primeros niveles |
| Mágico (azul) | ■ | 2 | sí | — | siempre | relleno de nivelación |
| Raro (amarillo) | ▲ | 3 | sí | — (se le puede **grabar** uno si es ranura con aspecto) | siempre | armadura final o base de grabado |
| Legendario (naranja) | ✦ | 3 | sí | 1 aspecto con rango 1–5 | siempre, **solo en las 6 ranuras con aspecto** | lo normal en el final del juego |
| Único (bronce) | ⬢ | **2 fijas** + 1 al azar | sí | poder propio | AL ≥ 20 | persecución con nombre (también en las armaduras) |
| Mítico (violeta) | ✸ | las del Único, **al paso 5** | sí | poder mítico | Pináculo, jefe T8+, 4 Chispas | techo fijo; **solo uno activo** |

- **Tope duro de 4 líneas** (3 + ◇) más aspecto o poder.
- **El conjunto (verde) desaparece.** Colores de hoy para C/M/R/L; Único `#c8a26a`, Mítico `#c58cff`, siempre con glifo de forma (XAG 103).

### 4.4 Líneas, unidad de presupuesto y topes

**Las 16 líneas.** «Tope» = valor con ◆52, paso 5 y peso 1. «Típico» = paso 3, ◆47 y peso 1 (el 72 % del tope en las % y el Principal; el 62 % en las planas). Entre paréntesis, el tope v3.

| Eje | Línea | Clave | Escala | Tope v4 (v3) | Típico | Ranuras |
|---|---|---|---|---|---|---|
| ⚔ Daño | Principal | `main` → `mainGear` | 1,035^◆ | **10** (15) | 7 | arma, guantes |
| ⚔ | % Daño | `dmgPct` | 1,035^◆ | **12 %** (13) | 8,6 % | arma, guantes, amuleto, anillos |
| ⚔ | **% Daño de tus ‹cat›** | `catDmg` con selector `@basic` / `@spender` / `@insignia` | 1,035^◆ | **26 %** (nuevo; sustituye a «% elemento», 16) | 18,6 % | arma, guantes, amuleto, anillos, foco/carcaj |
| ⚔ | % Crítico | `crit` | 1,035^◆ | **5,5 %** (10) | 3,9 % | **solo anillos** |
| ⚔ | % Daño crítico | `critDmg` | 1,035^◆ | **45 %** (50) | 32 % | arma, guantes, amuleto, anillos |
| ⚔ | % Vel. de ataque | `aspdPct` | 1,035^◆ | **18 %** (24) | 12,9 % | arma, guantes |
| ✚ Daño | % Enfriamiento | `cdr` | 1,035^◆ | **9,5 %** (10) | 6,8 % | casco, mano izq. |
| ✚ | **% Recurso** (genera y regenera; absorbe al «% Coste») | `resRatePct` | 1,035^◆ | **28 %** (17) | 20 % | casco, pecho, cinturón, botas, foco/carcaj |
| 🛡 Aguante | Vida | `hp` | G | **120** (100) | 74 | casco, pecho, cinturón, botas, amuleto, anillos |
| 🛡 | Armadura | `arm` | G | **115** (140) | 71 | casco, pecho, cinturón, botas, escudo |
| 🛡 | % Reducción de daño | `dr` | 1,035^◆ | **5,5 %** (8) | 3,9 % | pecho, cinturón, mano izq. |
| 🛡 | Bloqueo | `block` | 1,035^◆ | **7,5 %** (10) | 5,4 % | escudo |
| 🛡 | Esquiva (recarga) | `dodgeCdr` | 1,035^◆ | **0,6 s** (1,0) | 0,43 s | casco, botas |
| ✚ Aguante | Vida al golpear | `lph` | G | **15** (20) | 9,3 | arma, pecho, anillos, mano izq. |
| ✦ | +1 a tu ‹cat› | `skillLv` con selector | fija | +1 | +1 | arma (`@spender`), amuleto (`@insignia`/`@ultimate`/`@movement`); desde ◆ 36 |

- **f(paso)** = 0,70 · 0,775 · 0,85 · 0,925 · 1,00 para los pasos 1–5, y **1,50 para ★**.
- **Salen de las líneas** (con motivo): «% Coste» (fundido en «% Recurso»: `−17 %` de coste y `+17 %` de recurso daban lo mismo, ×1,20 frente a ×1,17), «% Daño de tu elemento» (R2-8), «% Vel. de movimiento» (implícito de botas, P4-D30), hallazgo mágico, «+Recurso máximo» (bug 3.6), maná al golpear (bug 3.7), espinas (aspecto del Guardián), resistencias (dormidas), Vitalidad.
- **«% Daño de tus ‹cat›»** suma al saco [+] de las habilidades de esa categoría (`mods['@spender'].dmg`, como un talento). Su tope (2,2× el de «% Daño») lo deja a la par cuando la categoría pone ≈ 45 % del DPS; vale más si tu build se apoya en ella y menos si no: **eso es la decisión** (el veredicto la mide con la parte real de cada categoría en tu barra).
- **«+1 a tu ‹cat›»:** **tope +1 por selector y sin tope global**; solo en arma (gastadoras) y amuleto (que nunca tira `@spender`), así que dos líneas nunca se pisan. Desde ◆ 36 (Nv50), para que no domine en los niveles bajos (no escala con el ◆).
- **Un solo indicador por línea:** ▰▰▰▱▱ (paso 1–5) y ▰▰▰▰▰★. Con Alt: `[mín–máx]`, valor exacto y [+] o [×].
- **Techo por pieza y por línea:** si una línea sale al azar **y** en el ◇, la suma se topa en el valor ★ de esa pieza («≈ 0 ⊘» en el engarce).

**`mainGear` (de la v3, sin cambios).** El Principal del equipo va a un acumulador propio que solo entra en `mainMult`; crítico, armadura, maná y regeneración leen los atributos **sin** equipo. `test93`: «el mismo objeto da el mismo Δ de `mainMult` en las 3 clases y ningún otro stat cambia».

**Paridad (IT6, por especialización y por eje).** Con el modelo [D] (`calc-r2.mjs` v4.2, salida (2b) y (2c): equipo típico = composición media de cada pool al paso 3 y gema grado 3; saco aditivo 60 fuera del equipo), una línea al paso 3, ◆ de su nivel y peso 1 aporta en su eje, **respecto de la mediana de las líneas de ese eje** (Daño: 8 líneas; Aguante: 5). Por clase, sin crítico condicional:

| Nv70 | Principal | % Daño | ‹cat› | % Crítico | % Daño crítico | % Vel. at. | % Enfr. | % Recurso | Vida | Armadura | % RD | Esquiva | Vida al golpear |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Guerrero | 1,08 | 0,99 | 0,97 | 1,08 | 0,95 | 1,02 | 0,99 | 1,00 | 0,95 | 1,04 | 1,00 | 0,91 | 1,18 |
| Maga | 1,07 | 0,99 | 0,96 | 1,09 | 0,95 | 1,03 | 1,00 | 0,99 | 0,90 | 1,10 | 1,00 | 0,91 | 1,12 |
| Arquera | 1,08 | 0,94 | 0,91 | 0,99 | **1,33 a** | 1,03 | 1,00 | 0,99 | 0,89 | 1,09 | 1,00 | 0,91 | 1,11 |
| Δ absoluto (G/M/A) | +4,0/3,9/3,9 % D | +3,6/3,6/3,4 | +3,5/3,5/3,3 | +4,0/3,9/3,6 | +3,5/3,4/4,8 | +3,7 | +3,6 | +3,7/3,6/3,6 | +4,1/3,9/3,9 % A | +4,5/4,8/4,8 | +4,4 | +4,0 | +5,2/4,9/4,9 |

- **v4.1 (R1-B-2):** crítico de talentos bien contado: las builds recomendadas de las 3 clases toman el nodo de clase c13 (Golpes Precisos / Mente Afilada / Ojo de Halcón) a rango 2, **+10 % de crítico** desde el Nv50 (`talents-<clase>.js`, `scaleFx` multiplica por rango, `talents.js:411-413`) [V].
- **v4.2 (verificación de R1-B-2):** la tirada usa `critChance(critRaw, cb)`, con **`cb` = crítico condicional** de las claves `tv`, de los poderes `condCrit` y de las posturas (`entities.js:1031-1038`; tope 60 tras todo, `combat-math.js:45, 169`) [V]. Cinco especializaciones lo llevan en **todas** sus builds recomendadas y en su estado normal de juego, así que la paridad del crítico y del daño crítico se mide **por especialización**:

  | Especialización (build por defecto) | Crítico condicional en su estado normal [V] | Crítico medio Nv70 · Nv100 | % Daño crítico / mediana, tope 45: Nv70 · Nv100 | Con el tope ≈ 32 (palanca de E4) |
  |---|---|---|---|---|
  | Berserker (Estampida) | Rajar +15 (b2 r3) y +10 a principales contra ralentizados (c20 Desequilibrio) | 30,0 · 37,0 | 1,37 · 1,59 | 0,97 · 1,13 |
  | Guardián (Guardia) | — (Sismo y Vanguardia: c20) | 18,7 · 25,7 | 0,95 · 1,21 | **0,68 · 0,86 a−** |
  | Cruzado (Celestial) | +10 contra tu Rival (Campeón, l10) y c20 | 33,2 · 40,2 | 1,48 · 1,68 | 1,05 · 1,19 |
  | Piromante (todas) | +15 contra objetivos en llamas (Calor Abrasador, s2 r3) | 33,7 · 42,7 | 1,49 · 1,75 | 1,06 · 1,24 |
  | Crionte (todas) | +15 con ≥ 3 capas (Filo Helado, i2 r3); Dardo +15 contra ralentizados en 3 de 4 builds | 33,7 · 42,7 | 1,49 · 1,75 | 1,06 · 1,24 |
  | Arcanista (Rayo) | +12 con 4 Cargas (Resonancia, a16 r2) y +5 con ≥ 2 (Mente Brillante, a2 r1; r3 = +15 en las otras 3 builds); Rayo +20 (a11 r2) | 44,7 · 53,7 | 1,80 · 2,02 | **1,28 · 1,44 a** |
  | Tiradora · Montaraz | — | 28,8 · 40,8 | 1,33 · 1,69 | 0,95 · 1,20 |
  | Francotiradora (todas) | +15 con la Concentración llena (`mech-arquera.js:28, 118`) | 43,8 · 55,8 | 1,78 · 2,06 | **1,27 · 1,46 a** |

  Fuentes: `talents-guerrero.js:72, 95, 133`, `powers-guerrero.js:83, 1131, 1643`; `talents-maga.js:84, 107, 145, 211, 277, 302, 311`, `powers-maga.js:151, 195, 1510, 2134, 2610`, `mech-maga.js:42, 186`; builds y `defaultBuild` de cada `talents-<clase>.js`. «Crítico medio» = clase + estado normal + 0,45 × el de la habilidad principal (la parte de su DPS). La columna «≈ 32» es una estimación lineal [D] (el valor de la línea es proporcional a su tope).
- **a = afinidad declarada, ahora por especialización.** El daño crítico vale en proporción a tu probabilidad de crítico, y esa probabilidad es distinta por especialización **a propósito** (18,7 % el Guardián frente a 44,7 % el Arcanista en el Nv70). Ninguna base global la deja a ±20 % en las 9 (R2-6). Regla: **IT6 exige ±20 % dentro de la especialización, salvo las afinidades declaradas (crítico y daño crítico), que van a ±50 % y se ven** (en Alt, «tu especialización prefiere: % daño crítico» o «aprovecha poco»), como las prioridades de stats por especialización de WoW [S]. Con el tope de partida (45), **8 de 9 especializaciones salen de ±20 % en el Nv70 y el Arcanista y la Francotiradora salen de ±50 % (1,78–2,06)**: la frase de la v4.1 «Guerrero y Maga sin afinidad (0,94–0,95)» solo valía sin el crítico condicional. **Palanca de E4: tope del daño crítico 45 → ≈ 32**: todas quedan dentro de ±50 % en los Nv70 y 100, con afinidad alta declarada para el Arcanista y la Francotiradora y baja para el Guardián.
- **Fuera de banda en el modelo (por clase, sin condicional):** en el Nv50, Armadura (1,32–1,47), Esquiva (0,67–0,72) y **Vida al golpear (1,25 en las 3 clases)**; en el Nv100, **Vida al golpear del Guerrero (1,21)** y el daño crítico (Guerrero 1,21, Maga 1,29, Arquera 1,69; con el tope ≈ 32: 0,86 / 0,92 / 1,20). Las corrige E4 (`GEAR_K_ARM`, topes de Armadura, Esquiva, Vida al golpear y daño crítico) con el banco real; lo que no alcance es crítico de especialización y va a E4b.
- **Entre especializaciones** no se exige paridad: el veredicto ya muestra la afinidad.

**Paridad por pool medida en ⚡ (IT6b).** Toda línea que comparte pool queda a ±20 % en g (w = 0,55, la mediana de los roles) para cada especialización en el Nv70, salvo afinidad declarada. En el modelo v4.2, por clase: todas dentro (0,85–1,16) salvo el daño crítico de la Arquera (1,23–1,41). Por especialización, el daño crítico en los pools ⚔ va de 0,93–0,99 (Guardián) a 1,64–2,01 (Arcanista y Francotiradora) con el tope 45; con ≈ 32, de ≈ 0,66–0,70 a ≈ 1,17–1,43 [D]. La Vida queda en 0,88–0,95 de su pool: **ya no es la línea que todos quieren**. Las ✚ de la v3 (0,5–0,7 de sus vecinas) suben a 0,97–1,01 al fundir Coste en Recurso y subir su tope (R2-7). La velocidad de movimiento (0,27–0,42) sale de las líneas.

**Techo de una pieza** (en «líneas al paso 5 y ◆52»; % y Principal):

| Estado de la pieza | Valor | % del techo |
|---|---|---|
| Raro recién caído (3 líneas, paso 3, ◆47) | 3 × 0,72 = 2,15 | 48 % |
| + ◇ grado 3 | 2,86 | 64 % |
| + mejora a ◆52 | 3,40 | 76 % |
| + Afinar a paso 5 y gema Perfecta | 4,00 | 89 % |
| + remate ★ | 4,50 | 100 % |

**Topes de crítico por especialización (todas las fuentes, v4.2).** Base 5 + Destreza **del nivel** × 0,15 (los atributos se reparten hasta el Nv20, `progression.js:17`) + **talentos 10** (c13 a rango 2) + **tablero** (Nv81+: Guerrero **7**, Maga **9**, Arquera 12: legendario, raro y los 3 nodos mágicos del brazo ofensivo, `paragon-board.js:24-38`, que la v4.1 no contaba en Guerrero y Maga) + anillos (5,5 × 1,5 × 1,125 = 9,3) + el **crítico condicional** de la tabla de arriba. Óptimo del Nv100 (`out-r2.txt` (5b)):

| Especialización | Global | Estado normal | + habilidad principal | Con Era de hoy (+12) | Build que más suma (con Era) |
|---|---|---|---|---|---|
| Berserker | 32,8 | 32,8 | 57,8 (Rajar contra ralentizados) | 44,8 / **69,8** | **67,8** (79,8) · Sangre y Acero, contra tu Rival |
| Guardián | 32,8 | 32,8 | 32,8 | 44,8 | 42,8 (54,8) · c20 |
| Cruzado | 32,8 | 42,8 | 52,8 | 54,8 / **64,8** | 52,8 (64,8) |
| Piromante | 34,8 | 49,8 | 49,8 | **61,8** | 49,8 (61,8) |
| Crionte | 34,8 | 49,8 | 49,8 | **61,8** | **64,8** (76,8) · Dardo contra ralentizados |
| Arcanista | 34,8 | 51,8 | **71,8** (Rayo) | **63,8 / 83,8** | **81,8** (93,8) · Rayo Orbital |
| Tiradora · Montaraz | 47,8 | 47,8 | 47,8 | 59,8 | 47,8 (59,8) |
| Francotiradora | 47,8 | **62,8** | 62,8 | **74,8** | 62,8 (74,8) |

**Cuatro especializaciones pasan de 60 sin Era** en su habilidad o su estado principal (Arcanista y Francotiradora con su build por defecto; Berserker y Crionte con la que más suma), y **seis con una Era de hoy** (en negrita). Además, el soporte Certero suma +25 de crítico a la habilidad que lo lleva (`skill-resolve.js:39`) [V]: con él, cualquier especialización pasa de 60 en esa habilidad. Bajar las Eras no lo arregla (la v4.1 las bajaba a +7: se revierte) y un tope duro deja muerto el anillo justo en las especializaciones de crítico. **Sobrecrítico (v4.2, contrato de E0.1 en `combat-math.js`):** la **probabilidad** se sigue topando en 60 % (así los efectos «al hacer crítico» no se disparan más), pero **lo que sobra no se pierde: el extra de tus críticos se multiplica por crítico ⁄ 60**. Con 72 %: 60 % de críticos que hacen ×1,2 de su extra. El daño esperado queda **lineal** en el crítico, igual que sin tope, así que cada punto de crítico rinde lo mismo por encima y por debajo de 60 y ninguna línea muere, ni con fuentes futuras (R20). Es la regla de Warframe con más de 100 % de crítico (lo que sobra sube el nivel del crítico y su daño) [S]. En el Alt: «Crítico 72 % → 60 % · tus críticos +20 %».

- **Por qué no «+2 % de daño crítico por punto sobrante»** (la propuesta del verificador): esa conversión vale según tu saco [+] y tu daño crítico; con el óptimo del Nv100 retiene solo el 46–58 % del valor de una línea de crítico cuando el crítico ya pasa de 60 (`out-r2.txt` (7); 81 % en la Francotiradora sin Era, que apenas lo cruza), por debajo del 80 % que pide IT3; el tope duro de hoy retiene 0 % en esos casos (24–88 % cuando la línea solo cruza el 60). La exacta retiene el 100 % por construcción y no tiene constante que medir.
- **Efecto en el DPS de hoy:** las especializaciones que hoy pasan de 60 (Francotiradora, Rayo del Arcanista, Rajar del Berserker con Era) **ganan** lo que hoy pierden en el tope (el Rayo de 71,8 % rinde ≈ +7–8 % frente al tope duro, con críticos de ×1,9–2,1 un golpe normal [D, a mano]). Lo mide el rebase de `PENDING_E4B` (E4) y lo calibra E4b.
- **Las Eras de crítico vuelven a su valor de hoy** (Cazador +12, Furia +10): con el sobrecrítico no hace falta tocarlas (§4.12).
- El Glifo de Precisión pasa a daño crítico (§4.12): con 4 Precisiones r10 el tablero daba ≈ +36 % de crítico. Con el sobrecrítico ya no dejaría líneas muertas, pero sería un multiplicador fuera de presupuesto.

El resto de los topes, con todo al ★ y ◆52:

| Línea | Ranuras (suma de pesos) | Máximo del equipo | Tope | Objetivo |
|---|---|---|---|---|
| % Enfriamiento | casco, mano izq. (1,75) | 24,9 % | 50 | ≤ 30 ✔ |
| % Vel. de ataque | arma, guantes (1,5) | 40,5 % (+6 del carcaj) | 100 | ≤ 60 ✔ |
| % Reducción de daño | pecho, cinturón, mano izq. (2,5) | 20,6 % | 50 (Guardián 65) | ≤ 30 ✔ |
| Esquiva | casco, botas (1,75) | −1,6 s (recarga 3 → 1,4 s) | mín. 0,6 s | ≥ 1 s ✔ |
| Bloqueo | escudo (0,75) | 8,4 % + 10 implícito | 40 (Guardián 50) | ✔ |
| % Recurso | 5 ranuras (4,25) | 178 % | sin tope (blando) | el veredicto lo valora a 0 cuando el recurso ya no limita |
| **Vida al golpear** | arma, pecho, anillos, mano izq. (3,625) | 82 por impacto | cubeta 6 % de la vida/s | una línea típica en el arma llena el **14 %** de la cubeta en UNI; el máximo del equipo la llena con ≈ 1,8 impactos/s (óptimo del Nv100) |

### 4.5 ◇ Engarce: la línea que eliges con una gema

- **1 engarce ◇ por pieza.** La gema **es** la cuarta línea. **6 gemas, 5 grados** (grado = paso 1–5). La gema no tiene nivel: rinde según el ◆ y el peso de la pieza.

  | Gema | Línea | Encaja en |
  |---|---|---|
  | Rubí | Vida | casco, pecho, cinturón, botas, amuleto, anillos |
  | Diamante | Armadura | casco, pecho, cinturón, botas, escudo |
  | Amatista | Principal | arma, guantes |
  | Esmeralda | % Daño crítico | arma, guantes, amuleto, anillos |
  | Zafiro | % Enfriamiento | casco, mano izq. |
  | Topacio | % Daño | arma, guantes, amuleto, anillos |

- Solo encaja si su línea está en el pool de la ranura. **Quitarla es gratis**; al vender o desguazar, vuelve sola (bug 3.5).
- **Combinar:** 3 de un grado → 1 del siguiente, por oro (500·grado). Tope en el grado 5 (bug 3.3).
- **Caen** 1 cada 2 élites, como mucho **Talladas** (grado 3): las Pulidas y Perfectas solo combinando (§4.13).

### 4.6 Aspectos (el corazón del rework)

**Anatomía** (dato puro, `js/aspects-<clase>.js`; sin cambios desde la v3):

```js
defineAspect('x_racimo_voraz', {
  name: 'Aspecto del Racimo Voraz', cls: 'maga', spec: 'piromante', cat: 'ofensivo',
  needs: { skill: 'bola_fuego', variant: 'bola_fuego_ii' },   // o solo { skill } o { gauge: 'calor' } o {}
  core:  { mod: { bola_fuego: { 'cluster.n': 1 } } },          // fijo: +1 brasa
  steps: { 4: { mod: { bola_fuego: { 'cluster.n': 1 } } } },   // umbral: otra brasa más desde r4
  scale: { mod: { bola_fuego: { 'cluster.coef': [40, 44] } } },// lo que crece de r1 a r5
  delta: { skill: 'bola_fuego', scen: 'AREA', r1: 0.06, r5: 0.15 }, // Δ declarado; F10 lo mide
  text: r => `Racimo suelta ${r >= 4 ? 5 : 4} brasas al ${v(r)} % cada una`,
});
```

- **Entra por el canal de los talentos:** `aggregateAspects(p)` produce un agregado con la forma de `talentAgg` más `gaugeStats`; `recompute` lo suma tras los talentos y suma `gaugeStats` a `p.powerStats` tras `firePower('stats')` (`spec-mechanics.js:197-201`) [V]; las claves `tv` entran antes de `usesCoreTv`; la Insignia usa `@insignia` (`talents.js:445`) [V].
- **Rango 1–5:** `core` ≤ 40 % del valor en r5; r1 ≈ 50 %; las cuentas discretas se abren por umbral (+1 en r1, +1 más en r4). El texto muestra el valor al rango actual.
- **Categoría → ranuras con aspecto (P4-D24, v4):**

  | Ranura | Ofensivo | Defensivo | Utilidad | Movilidad | Mecánica |
  |---|---|---|---|---|---|
  | Arma | ✔ | | | | ✔ |
  | Mano izq. | | ✔ | ✔ | | ✔ |
  | Guantes | ✔ | | ✔ | ✔ | |
  | Amuleto | ✔ | ✔ | ✔ | ✔ | ✔ |
  | Anillos | ✔ | ✔ | | | ✔ |

- **Reglas:**
  1. Un aspecto por pieza; dos iguales no se suman (el segundo, «inactivo · duplicado»).
  2. **≤ 2 de 4 aspectos de especialización piden una variante concreta («V»), y esas dos son de habilidades distintas.** Si dos «V» fueran variantes excluyentes de la misma habilidad (en la v3, Molino y Estocada Partida en Rajar; Lanza Pesada y Abanico Helado en la Lanza), nunca estarían activas a la vez (R2-2).
  3. Si falta la variante o la habilidad, el aspecto se ve **atenuado** con «Pide: Molino» o «Se activa al Nv 27». En la forja del libro, la variante que tu equipo potencia lleva un ✦.
  4. **Presupuesto:** en r5, ≤ +15–25 % de la habilidad que toca; los de mecánica, ≤ +10 % del DPS. Cada aspecto declara su Δ y F10 lo mide.
  5. **[×] escaso:** solo los «mayor» usan `registerMultiplier`; ≤ 1 activo.
  6. Los efectos con disparadores van por `definePower` (`js/powers-aspects-<clase>.js`, prefijo `x<g|m|a>_`).
  7. **Cobertura con decisión (O3):** para cada especialización y **cada combinación de variantes** de las 6 habilidades de su barra (≤ 3⁶ = 729, sin mezclar variantes excluyentes; v4.2: `FORGE_RECO` no fija la variante de Rajar del Berserker ni la de la Lanza del Crionte, `skills-guerrero.js:611`, `skills-maga.js:912` [V], así que «la recomendada» no es una sola), los aspectos **útiles** (activos con esa barra; «del Vendaval» solo si hay una habilidad de un proyectil) admiten una asignación sin duplicados a las 6 ranuras, cada ranura tiene ≥ 3 candidatos y el total es ≥ 9. `test-aspects-cobertura` lo comprueba con un emparejamiento bipartito por combinación (es barato).
  8. **Los aspectos de clase sirven a las 3 especializaciones** con su barra recomendada (salvo los «V»). En la v3 tres de ellos pedían habilidades que ninguna barra recomendada lleva (Embestida, Parpadeo, Paso Veloz) y uno, la Barrera; los cambié por efectos sobre «tu habilidad de Movilidad» (`@movement`) o sin requisito.
- **Códice de cuenta (por reino):** guarda el **mejor rango**. Desguazar un legendario lo guarda y da Polvo. **Grabar** pone un aspecto del Códice, a tu mejor rango, en un **Raro** (pasa a Legendario) **o en un Legendario** (reemplaza su aspecto), siempre en una ranura con aspecto; el aspecto **no se gasta** del Códice, y Grabar no crea aspectos ni rangos nuevos (§4.11). Los que faltan se ven en silueta con su coste en Polvo.

**Cobertura en los dos casos que fallaban en la v3** (candidatos útiles por ranura; dos combinaciones de ejemplo, el test recorre todas):

| Especialización (configuración) | Útiles | Arma | Mano izq. | Guantes | Amuleto | Anillos |
|---|---|---|---|---|---|---|
| Berserker (Rajar ii · Furia i) | Molino, Torbellino Rojo, Sed Insaciable · Tajo Desgarrador, Piel Viva, Coraza de Furia, Zancada Firme · Furia, Volátil, Festín, Viento, Reloj = **12** | 6 | 7 | 7 | 12 | 9 |
| Crionte (Lanza ii · Tormenta i) | Abanico Helado, Ventisca Viva, Prisión Afilada, Invierno Eterno · Dardo Gemelo, Piel de Ceniza, Maná Templado, Paso Arcano · Furia, Volátil, del Vendaval (el Dardo Arcano es de un proyectil), Festín, Viento, Reloj = **14** | 8 | 7 | 9 | 14 | 11 |

12–14 candidatos para 6 ranuras: el BiS sale de una **decisión** (más daño, más aguante o más ritmo), no por eliminación. En la configuración alternativa quedan 13 en las dos y siguen ≥ 3 por ranura: el Berserker con Frenesí suma Furia sin Freno (Molino sigue, porque pide Rajar y no Furia); el Crionte con Lanza Pesada pierde Abanico Helado. Con Rajar sin la variante Molino, el Berserker queda en 11 útiles y ≥ 3 por ranura: sigue cumpliendo. Al recorrer todas las combinaciones, el test también mira el Arcanista: su forja recomendada pone el Rayo en la variante ii (`skills-maga.js:913`) y Cadena Larga pide Rayo i; con esa forja, Cadena Larga sale atenuada y cuenta como no útil.

**Ejemplos: 4 por especialización (36), con su Δ.** Todos usan habilidades, variantes y números del catálogo de `paso2-impl` [V en `skills-<clase>.js`]. «Pide»: variante (V), habilidad con cualquier variante (H) o indicador (M). Cambian dos frente a la v3 (en **negrita**).

| Esp. | Aspecto | Pide | Cat. | Efecto (r1 → r5) | Δ r1 → r5 |
|---|---|---|---|---|---|
| **Berserker** (Sed) | Molino de Huesos | V: Molino (Rajar ii) | Ofens. | El 3.er giro deja un sangrado del 30 → 50 % en 3 s | +10 → +17 % de Rajar |
| | **Furia sin Freno** | V: Frenesí (Furia Inmortal ii) | Ofens. | Durante Frenesí, cada golpe de Rajar alarga la definitiva 0,2 → 0,4 s (hasta +4 s) | +8 → +14 % de la definitiva |
| | Torbellino Rojo | H: Remolino Sangriento | Mecán. | Golpear a 3+ con un giro da +1 de Sed (r1: cada 2 giros; r4: cada giro) | +4 → +8 % DPS |
| | Sed Insaciable | M: Sed | Mecán. | +10 → +20 % de Sed máxima (`gaugeMax:sed`); matar con la Sed llena cura un 3 → 5 % | +3 → +6 % DPS · ? |
| **Guardián** (Bastión) | Martinete | V: Martinete (Terremoto i) | Ofens. | +3 → +5 de Quebranto y una grieta de 2 s al 15 → 25 %/s | +15 → +25 % de Quebranto |
| | Muro Viviente | V: Ciudadela Andante | Defens. | La reducción baja a −28 → −32 % | +4 → +9 % de Aguante |
| | Espinas de Hierro | H: Cambio de Guardia | Defens. | En Muralla devuelves el 15 → 25 % del daño cuerpo a cuerpo | ? |
| | Bastión Firme | M: Bastión | Mecán. | Bloquear da +1 de Bastión (r1: 1 de cada 2; r4: cada uno) | +5 → +10 % de Aguante |
| **Cruzado** (Fervor) | Martillo Justo | H: Martillo de Guerra | Util. | Ventana perfecta un 15 → 30 % más ancha | +3 → +6 % del Martillo |
| | Onda Doble | V: Onda Sagrada (Martillo ii) | Ofens. | Tras una suelta perfecta, la onda se repite al 30 → 50 % | +7 → +12 % del Martillo |
| | Sentencia Firme | V: Sentencia (Juicio i) | Mecán. | La marca dura 15 → 18 s y detonarla da 1 de Fervor | +4 → +8 % · ? |
| | Sendero Bendito | H: Sendero de Luz | Movil. | +1 → +2 s y cura un 2,5 → 3 %/s | ? (grupo) |
| **Piromante** (Calor) | Racimo Voraz | V: Racimo (Bola de Fuego ii) | Ofens. | 4 brasas (5 desde r4) al 40 → 44 % | +6 → +15 % de la Bola |
| | Meteoro Certero | H: Meteoro | Ofens. | Cae 0,2 → 0,3 s antes y deja suelo ardiendo 2 s al 10 → 20 %/s | +5 → +10 % del Meteoro |
| | Sol Errante | V: Sol Errante (Supernova i) | Ofens. | 5.º estallido al 60 → 100 % | +15 → +25 % de la definitiva |
| | Horno | M: Calor | Mecán. **mayor [×]** | Con el Calor al máximo, golpes de Fuego ×1,05 → ×1,10 | +3 → +7 % DPS |
| **Crionte** (Escarcha) | **Ventisca Viva** | V: Ventisca Anclada (Tormenta Glacial i) | Ofens. | La ventisca crece 1 → 2 m y quien sigue dentro 3 s se congela 0,5 → 1 s | +8 → +15 % de la definitiva · ? |
| | Abanico Helado | V: Abanico Gélido (Lanza ii) | Ofens. | 4 lanzas (antes 3 al 50 %) al 42 → 45 % | +12 → +20 % de la Lanza |
| | Prisión Afilada | H: Prisión de Hielo | Mecán. | Al romperse deja 1 → 2 capas | ? |
| | Invierno Eterno | M: Escarcha | Mecán. | Los congelados siguen +0,5 → +1 s | ? |
| **Arcanista** (Cargas) | Orbe Gemelo | V: Orbe Gemelo (Orbe ii) | Ofens. | 3 orbes al 42 → 46 % | +5 → +15 % del Orbe |
| | Cadena Larga | V: Rayo en Cadena (Rayo i) | Ofens. | 4.º salto al 35 → 60 % | +11 → +19 % del Rayo |
| | Sello Amplio | H: Sello del Archimago | Defens. | +1 → +2 m y +1,5 → +3 s | +3 → +6 % de Aguante |
| | Cargas Vivas | M: Cargas | Mecán. | Duran +1 → +3 s; desde r4, +1 Carga máxima | +4 → +12 % del Rayo |
| **Tiradora** (Impulso) | Tercera Andanada | H: Andanada | Ofens. | 3.ª andanada al 40 → 60 % | +13 → +20 % |
| | Abanico Abierto | V: Abanico Abierto (Flecha Múltiple i) | Ofens. | 8 flechas al 38 → 41 % | +14 → +23 % en ÁREA |
| | Carrera Certera | V: Carrera Certera | Movil. | Disparas cada 0,54 → 0,50 s | +11 → +20 % en la carrera |
| | Viento a Favor | M: Impulso | Mecán. | Moverte llena el Impulso un 15 → 25 % más rápido | +3 → +6 % DPS |
| **Francotiradora** (Concentración) | Pulso Sereno | H: Disparo Apuntado | Util. | Ventana perfecta un 15 → 30 % más ancha | +3 → +6 % |
| | Tiro Pesado | V: Tiro Pesado (Apuntado ii) | Ofens. | Tensas hasta 3 s: máximo 330 → 360 % | +10 → +20 % |
| | Haz Único | V: Haz Único (Tiro Celestial ii) | Ofens. | Una suelta perfecta devuelve el 25 → 50 % del enfriamiento | +8 → +15 % |
| | Mirada Quieta | M: Concentración | Defens. | De rodillas, los golpes quitan un 50 → 100 % menos de Concentración | ? |
| **Montaraz** (Coto) | Cuarto Cepo | H: Trampa de Cepo | Mecán. | Rearme 10 → 20 % antes; desde r4, 4.ª trampa (`gaugeMax:coto`) | +8 → +18 % |
| | Cadena de Pólvora | V: Detonación en Cadena (Detonante i) | Ofens. | La cadena alcanza 7 → 8 m | +6 → +12 % en ÁREA |
| | Red Pesada | V: Red de Caza (Cepo ii) | Defens. | Inmoviliza 3 → 3,5 s; a un jefe, 8 → 15 de Quebranto | ? |
| | Rastro de Presa | M: Coto | Mecán. | Si una trampa atrapa a la Presa, se rearma sola (1 cada 15 → 10 s) | +4 → +8 % |

- Comprobado contra el catálogo: Frenesí es `g_u_furia_ii` y Molino `g_rajar_ii` (`skills-guerrero.js:492,502`); Ventisca Anclada es `m_u_tormenta_i` y Abanico Gélido `k_lanza_ii` (`skills-maga.js:827,834`) [V]. Las 9 especializaciones tienen sus dos «V» en habilidades distintas.
- **Aspectos de clase (12: por clase, 1 ofensivo, 2 defensivos y 1 de utilidad):**

  | Clase | Ofensivo | Defensivo | Defensivo | Utilidad |
  |---|---|---|---|---|
  | Guerrero | Tajo Desgarrador (V: Desgarro): sangrado 70 → 80 % | Piel Viva (H: Piel de Hierro, en las 3 barras): +1 → +2 s | Coraza de Furia: con ≥ 50 de Furia, −3 → −6 % de daño (`condDr`) | **Zancada Firme:** tu habilidad de Movilidad recarga un 15 → 25 % antes y al terminar no te ralentizan 1 s |
  | Maga | Dardo Gemelo (H: Dardo Arcano): 2.º dardo al 30 → 50 % | **Piel de Ceniza:** un golpe de > 10 % de tu vida te da un escudo del 5 → 8 % (cada 10 s) | Maná Templado: con el Maná > 50 %, −3 → −6 % de daño | **Paso Arcano:** tu Movilidad recarga un 15 → 25 % antes y deja 1 → 2 s de +20 % de Maná regenerado |
  | Arquera | Cicuta Profunda (V: Flecha de Cicuta): +10 → +18 % | Humo Denso (H: Bomba de Humo): +1 → +2 s | Cuero Curtido: moviéndote, −3 → −6 % de daño | **Paso Ligero:** tu Movilidad recarga un 15 → 25 % antes y tu siguiente disparo hace +10 → +20 % |

- **Universales (6):** de la Furia (Ofens., mayor [×]), Volátil (Ofens.), del Vendaval (Ofens.: +1 proyectil solo a habilidades de un proyectil), del Festín (Defens.), del Viento (Movil.) y del Reloj (Util.).

### 4.7 Únicos y Míticos

- **Únicos:** nombre propio, base fija, **2 líneas fijas** (el paso se tira y se puede afinar), 1 al azar, ◇ y un **poder propio** que no se extrae. Catálogo inicial de 10: las **4 reliquias** de jefe (amuletos) y **2 por clase**, con **≥ 1 Único en cada armadura** para que casco, pecho, cinturón y botas tengan persecución con nombre: Égida del Faro (escudo) y Coraza del Coloso (pecho) del Guerrero; Corona del Fénix (casco) y Faja del Archivo (cinturón) de la Maga; Cuerda de la Garza (arco) y Botas del Rastreador (botas) de la Arquera. En otra clase, el poder queda atenuado y las líneas cuentan.
- **Míticos (1 por especialización, 9):** líneas del Único **al paso 5**, un **poder mítico** y **cambio libre de su línea al azar** fuera de combate (P4-D19).
  - **Solo uno activo** (nuevo): un segundo Mítico equipado no da líneas ni poder; equiparlo desequipa el anterior. D4 limita a un Mítico fabricado equipado [S]. Lo valida `validateLoadout` (§8).
  - **Fuentes:** Pináculo y jefes de T8+, y **4 Chispas → el Mítico que elijas de tu clase**. Chispas: 1 segura por Pináculo (+15 % de una 2.ª), 5 % por jefe de grieta en T8+, y 2 por desguazar un Mítico repetido.
  - Ejemplo: «Ojo del Archimago» (Arcanista, foco): «Con 3 Cargas, el Rayo en Cadena salta también entre tus Orbes».

### 4.8 Qué se queda, qué se funde y qué se va

| Sistema de hoy | Destino | Qué pasa con lo guardado |
|---|---|---|
| Rarezas N/M/R/L | **Se quedan**, sin `statMult` | Afijos convertidos a las líneas v4 con su paso (§9) |
| Conjuntos | **Se van** | Cada pieza pasa a Raro con 3 líneas del pool |
| Afijo ★ (8 %, ×1,5) | **Se funde**: ★ = paso 6 | ★ conservada |
| Calidad 0–5 | **Se funde** en el ◆ (rango) | rango = calidad |
| Gemas (6, ilvl propio) | **Se funden** en el ◇ | Grado por ilvl; la 1.ª gema que encaja queda; las demás, a la bolsa; Esmeraldas viejas → daño crítico |
| Fue/Des/Ene en objetos | **Pasan a Principal** solo en arma y guantes | En otras ranuras, re-tirada del pool con el mismo paso; aviso a la Arquera («tu crítico baja») |
| Legendarios en casco, pecho, cinturón o botas | **Pasan a Raro** | Su aspecto va al Códice (+5 de Polvo); aviso |
| Runas y palabras rúnicas | **Se van** | Cada runa da 300 de oro |
| Charms | **Se van** | Cada charm da 500 de oro, con aviso |
| Reliquias | **Pasan a Únicos** de amuleto | Conservan nombre y ◆ |
| Míticos | **Se rehacen** (§4.7) | Legendario con el aspecto universal del 1.er poder; el 2.º al Códice; +2 Chispas |
| 6 poderes legendarios | **Pasan a aspectos universales** | Avaricia → un universal por semilla |
| Códice por héroe | **Pasa a la cuenta** (reino local) | Unión, con el mejor rango |
| Encantadora | **Se funde** en la re-tirada | — |
| Cubo | **Se va** | El contenido vuelve a la mochila |
| Identificar | **Automático** | — |
| Tienda, apuesta, alijo, filtro, favoritos, balizas, halo, etiquetas del HUD de botín | **Se quedan y mejoran** | Alijo migrado a pestañas |
| Glifos | **Se quedan, uno de cada tipo** | El mejor de cada tipo queda; cada repetido le sube 1 rango (tope 10); Precisión → daño crítico (bug 3.4) |
| Llaves, Fragmentos de Pináculo, soportes | **Se quedan** (materiales en pila) | — |
| Hombreras y pantalones (P4-D1 = b, aprobada) | **Se van** | Desguace con **doble** reembolso; aspectos al Códice; aviso |

### 4.9 Crafteo: la Herrería

**Una NPC (la Herrera) con 6 acciones. Todo se paga con oro** (P4-D26). El Polvo es del Códice.

**Capas de crafteo del Paso 4 (MVP cerrado, INV-B-3):** mejora con remate ★, re-tirada dirigida de una línea, Afinar y grabado del Códice con rango. El engarce ◇ **sustituye** a gemas y huecos (no suma una capa) y el Mítico por Chispas es una receta, no un sistema. **Fuera:** templado, sellos, Talismán, cubo, encantadora, runas y palabras rúnicas. Una capa nueva solo entra con el criterio de §12.4.

| Acción | Qué hace | Coste de partida | Regla |
|---|---|---|---|
| **Mejorar** | Rango r → r+1 (+1 ◆) | oro 400·(r+1)·(1 + ◆/20) × **factor de ranura** (r0 → r5 en ◆47–52: 20 900 × factor) | En el rango 5, **remate ★** en una línea al azar |
| **Mover la ★** | La ★ a otra línea al azar | oro 10 000·1,5ᵏ (k = movimientos en esa pieza) | **Sin tope**: sumidero terminal |
| **Re-tirar una línea** | Eliges la línea; ves **2 opciones** del pool (al paso 2–4) o te quedas con la tuya | oro 3 000·1,5ⁿ (n = re-tiradas en la pieza, tope n = 6) | Desde la primera, **solo esa línea**. Nunca la ◇ ni la ★. Pool corto: la 2.ª opción es tu misma línea con otro paso |
| **Afinar** (nuevo) | Tiras un dado 1–5 para una línea: **te quedas con el mayor** (el paso nunca baja) | oro 3 500·1,3ᵐ × factor (m = tiradas de afinar en esa pieza) | **Sin tope**. De media 5 tiradas por línea hasta el paso 5. No toca la ★ |
| **Engarzar** | Pone o quita una gema | Gratis | «≈ 0 ⊘» si el tope de la pieza se come el valor |
| **Grabar aspecto** | Aspecto del Códice → Raro (pasa a Legendario) o Legendario (reemplaza el suyo) | oro 1 500·rango | Solo en las 6 ranuras con aspecto; no sobre Únicos ni Míticos. El aspecto no se gasta del Códice: es una copia, sin material escaso (decisión de §4.11, como el Ocultista de D4) |
| **Desguazar** | Objeto → oro (+ Polvo y Códice si es Legendario) | — | Lote con resumen y **Deshacer (10 s)**; Legendario+ nunca entra en un lote salvo que lo marques. **Vender y desguazar dan lo mismo** |

- **Factor de ranura:** arma ×1,5 · casco y pecho ×1,0 · mano izq., guantes, cinturón, botas y amuleto ×0,75 · anillo ×0,6.
- **Afinar, una pieza de factor 1** (5 tiradas por línea, ×1,3 por tirada): 1.ª línea ≈ 31 600 (0,24 h de oro), 2.ª ≈ 117 000 (0,9 h), 3.ª ≈ 437 000 (3,4 h). **Es el sumidero que crece:** lo barato se hace pronto en cualquier pieza; lo caro, solo en las finales. Es el patrón del masterworking de D4 (costes que suben y remate que se re-tira) [S] y del Divine Orb de PoE (re-tirar valores, nunca afijos) [S], con una diferencia a propósito: aquí nunca baja, para que no se sienta como una tragaperras.
- **Rendimiento del desguace:** Común 60 · Mágico 150 · Raro 400 · Legendario 800 y 5 de Polvo · Único 1 200 y 10 · Mítico 2 000, 20 y 2 Chispas. Las gemas vuelven a la bolsa.
- **Azar con semilla por objeto:** la re-tirada n usa `hash(item.seed, 'reroll', n)`; el dado de Afinar, `hash(item.seed, 'afinar', m)`; el remate, la ★ y la apuesta, igual. Recargar no cambia el resultado (bug 3.15). En la escalera la semilla la guarda el servidor (§8).
- **Regla de inversión aplicada:** la mejora es barata frente al oro (todo el equipo de r0 a r5 ≈ 1,4 h de oro); las gemas se recuperan; tu aspecto se regraba desde el Códice; lo que se pierde al cambiar de pieza son las re-tiradas, Afinar y la ★, que se hacen en piezas finales.

### 4.10 Mercader, apuesta, cofre del jefe y protección contra la mala suerte

- **Mercader:** 6 objetos (Mágicos y Raros) de tu ◆ − 3, por ranura, y gemas Astilladas y Toscas. Se renueva al volver al pueblo tras ≥ 5 min. **Recompra de 12**. Stream `economy`.
- **Apuesta por ranura** (D2 y el Purveyor de D4): eliges la ranura y pagas oro (joyería ×1,25). Sale **Raro (70 %, pasos ≤ 3 y sin ★), Legendario (27 %, solo en ranuras con aspecto; en las armaduras, Raro) o Único (3 %)** al ilvl de tu nivel. **Precio = 2 × oro por hora ÷ objetos Raro+ por ranura y hora matando**, tabla fija por tramo de nivel que mide `loot-bench` (Nv70 T0: 2 × 130 000 ÷ 9,3 ≈ **28 000**). Gastar todo el oro de una hora en una ranura da ≈ 4,7 bases, **la mitad** de las que salen matando (9,3), y ≈ 1,3 legendarios frente a 3,7 (R2-3).
- **Cofre del jefe de grieta: «elige 1 de 3»:** 3 legendarios de tu clase, ≥ 1 de tu especialización y ≥ 1 nuevo para tu Códice si te falta alguno. Las otras 2 cartas dan 5 de Polvo cada una (u 800 de oro si tu Polvo está en el tope).
- **Polvo en el Códice:** 25 compran un aspecto **elegido** de tu clase a **r1**; 25·r suben de r a r+1 (r1 → r5: 250). **Tope de 1 000** (FFXIV topa sus tomos en 2 000 [S]).
- **Jefes de zona con su aspecto:** la primera muerte de cada jefe de piso abre su aspecto en el Códice a r1.
- **Resultado:** un aspecto concreto en ≤ 5 legendarios; los 6 aspectos de tu build a r5 en ≈ 10 h de Polvo.

### 4.11 Ritmo del botín (objetivos para E4)

- **Menos objetos y mejores** (D4 T4): objeto por común 18 % → **12 %**; sin blancos desde AL 15.
- **Reparto de partida** (T0, piso 21): Mágico 62 · Raro 31 · **Legendario 6** · Único 1. **1 legendario cada ~140 comunes** por caída (hoy ~860 por caída), siempre en una ranura con aspecto.
- **Tasa efectiva, no solo caída (INV-B-1).** Hoy el cubo sube rareza en cadena pagando solo oro (3 normales → mágico → raro → legendario, dirigido por ranura si las 3 piezas la comparten: `economy.js:251-254, 336-358`) [V]; con la mezcla real de caídas da ≈ 1 legendario cada ~70 comunes, unas 12 veces la caída, y la grieta completada suma uno seguro (`main.js:1284-1285`) [V]. **En el Paso 4 el cubo se va (§4.8) y ya no hay cadena desde blancos ni ninguna receta que cree un aspecto o un rango que no esté en tu Códice.** Queda una subida de rareza pagada con oro, **a propósito**: Grabar sobre un Raro.
- **Grabar sobre un Raro es un legendario dirigido por oro, y se acepta (decisión v4.2).** Con el Códice lleno, cada Raro de una ranura con aspecto puede pasar a Legendario con **tu** aspecto a **tu** mejor rango por 1 500–7 500 de oro. Matando caen ≈ 6,8 Raros por ranura y hora (8 por grieta × 8,5 ÷ 10) frente a ≈ 3,7 legendarios: grabarlos todos daría ≈ 1,8 × los legendarios que caen con aspectos r1 y ≈ 0,8 × con r5 (el oro lo limita a ≈ 17 grabados por hora). **No se pide material escaso** (la opción b2 del verificador, +5 de Polvo al grabar en un Raro, choca con P4-D26 «la Herrería cobra solo oro» y con el principio 8 «el Polvo es del Códice»; queda como alternativa en §14). Razón: Grabar **no crea poder nuevo**, copia uno que ya ganaste; es el modelo de D4, donde el Ocultista graba un aspecto del Códice sobre un Raro, que pasa a Legendario, por oro y materiales comunes, y el aspecto queda guardado para siempre [S: PureDiablo, *Legendary Aspect*; Fextralife, *Occultist*]. **Consecuencia escrita:** tras ≈ 10–12 h (los 6 aspectos de la build a r5, §4.13) un legendario que cae vale su Polvo y su aspecto o rango **si es nuevo**; la persecución pasa a la **base** (◆, líneas y pasos, con el Tormento subiendo los pasos 5 y la ★ al caer), los **Únicos** y los **Míticos**. Por eso las metas cuentan **todas** las fuentes (caída, élites, jefe de piso, cofre de grieta, apuesta, mercader y grabado), y **la escasez que se mide es la de aspectos y rangos nuevos por hora y la de bases Raro+ por ranura**, no la de objetos naranjas (IT7).
- **Sesgo de aspecto:** 85 % de tu clase y, de esos, la mitad de tu especialización activa; los de habilidades que ya conoces pesan ×2. **Rango al caer** (T0): r1 40 % · r2 30 % · r3 18 % · r4 9 % · r5 3 %; cada escalón de Tormento mueve un 3 % de r1 a r4–r5.
- **Pasos al caer:** 1–5 al 20 % cada uno en T0; Tormento según §4.2.
- **Élite:** 1 objeto seguro (+30 %) y, cada 2 élites, 1 gema. **Jefe de piso:** Raro+ seguro (40 % Legendario). **Jefe de grieta:** el cofre más su `rollDrops`.

### 4.12 Fuentes de stats que compiten con el equipo (topes)

| Fuente | Cambio | Por qué |
|---|---|---|
| Bendiciones | **Nivel máximo 10**; Ojo Certero (`b_crit`) → **daño crítico** | `b_dmg` ≤ 28 % (antes 62 % en grieta 27) |
| Era | «Bastión» escala con G(AL); **«Cazador» (+12) y «Furia» (+10) no cambian su crítico** (v4.2: se revierte la bajada a +7 de la v4.1) | «Bastión» da hoy +80 de vida sin escalar. Con el sobrecrítico (§4.4), lo que una Era sume por encima de 60 hace más fuertes los críticos en vez de perderse, así que no hace falta bajarlas |
| **Glifos** (nuevo) | **Uno de cada tipo por tablero** [D]; los repetidos suben 1 rango al tuyo (tope 10); **Glifo de Precisión → daño crítico** | `socketGlyph` (`economy.js:514-528`) [V] no impide engarzar 4 Precisiones r10 (≈ +36 % de crítico) |
| Tablero | Sin cambios; su crítico (G 7 · M 9 · A 12: legendario, raro y 3 nodos mágicos del brazo ofensivo, `paragon-board.js:24-38`) está en la tabla de §4.4 | La v4.1 contaba G 4 y M 6 (sin los nodos mágicos) |
| Collar, Tormento | Se quedan con el hallazgo mágico y la cantidad de botín | P4-D12 |

### 4.13 Economía: fuentes, sumideros y horas

**Unidad de tiempo:** una grieta de nivel 10 en T0 con un héroe Nv70 ≈ 7 min (≈ 130 comunes, 8 élites y el jefe) ⇒ **≈ 8,5 grietas por hora** [D, lo mide `loot-bench`]. Números en `calc-r2-econ.mjs` y `out-r2-econ.txt`.

| Recurso | Fuentes por grieta | Por hora | Sumideros |
|---|---|---|---|
| **Objetos** | ≈ 16 Mágicos, 8 Raros, 1,6 Legendarios (+1 del cofre), 0,3 Únicos | ≈ 93 Raro+ (≈ 9,3 por ranura) · ≈ 22 legendarios (≈ 3,7 por ranura con aspecto) | desguace |
| **Oro** | ≈ 15 000 (comunes, ventas y desguace) | ≈ 130 000 | mejorar (todo el equipo ≈ 177 000), re-tirar (3 000·1,5ⁿ), **afinar** (3 500·1,3ᵐ × factor), mover ★ (10 000·1,5ᵏ), grabar (1 500·r), combinar gemas (500·grado), pestañas del alijo (25 000), apuesta (≈ 28 000) |
| **Polvo** | ≈ 19 (legendarios desguazados, cofre, Únicos) | ≈ 165 | aspecto r1 (25), subir rango (25·r); **tope 1 000** |
| **Gemas** | 1 cada 2 élites (≈ 4), Astillada a Tallada según la zona | ≈ 34 | engarce (gratis), combinar (3 → 1) |
| **Chispas** | Pináculo 1,15 · jefe de grieta T8+ 0,05 | ≈ 0,3 (un Pináculo cada 4 h) | Mítico elegido (4) |

**Metas en horas desde el primer Nv70** (IT7, ±30 %):

| Meta | Qué es | Horas | Cuello de botella |
|---|---|---|---|
| **Build funcional** | Las 6 ranuras con aspecto con uno útil (r ≥ 1), arma y 2 piezas a r5, gemas Talladas | **2–4 h** | legendarios de la ranura justa y Polvo; el oro, ≈ 0,6 h |
| **Build completa** | Los 6 aspectos de tu build a **r5**, las 10 piezas a r5, **gemas Perfectas** | **12–20 h** | Polvo (1 650 ≈ 10 h); gemas Perfectas (≈ 7–10 h: 4 de un tipo = 36 Talladas a ≈ 3,8 por tipo y hora); oro de la mejora ≈ 1,4 h |
| **Techo** | **Afinar** las 3 líneas de las 10 piezas al paso 5, ★ en la línea elegida, Mítico de tu especialización | **40–60 h** | oro: afinar ≈ 38 h + mejora, ★, re-tiradas y grabado ≈ 3,5 h (≈ 41,5 h en total); Chispas ≈ 13 h por Mítico, en paralelo |

- **Después del techo** el oro sigue teniendo uso: mover la ★ (×1,5 cada vez, sin tope), la apuesta y afinar piezas de Tormento más alto (que caen con mejores pasos). El Polvo llega a su tope y el cofre paga en oro.
- **Lo que no puede pasar** (IT7): que una fuente pagada con oro (apuesta o mercader, con la política óptima de conversión) dé más de la mitad de las **bases Raro+ por ranura y hora** que matar; que **la apuesta** dé más de la mitad de los **legendarios por ranura y hora** que matar (el grabado queda fuera de esa cuota porque solo copia un aspecto que ya está en el Códice, §4.11); que alguna fuente dé **aspectos o rangos nuevos** por hora fuera de la meta; que alguna receta pagada con oro **cree un aspecto o un rango** que no esté en el Códice o suba Común → Mágico → Raro (INV-B-1); que el oro sin gastar pase de **2 h de ingresos** entre las horas 2 y 60 con la política de gasto del banco (afinar cuando su Δ⚡ por oro supere al de apostar); que el Polvo tope antes de la hora 20; que las gemas Perfectas lleguen antes de las 7 h; que un aspecto concreto pase de 5 legendarios.
- **Comparación:** WoW Midnight frenaba la mejora con 20 emblemas por rango y un tope semanal de 100 [S], retirado en mayo de 2026 como recuperación [S]; FFXIV topa sus tomos (450 por semana, 2 000 acumulados) [S]. Aquí no hay topes semanales (se juega solo o con amigos y el guardado es local): **el ritmo lo ponen los precios que crecen**.

---

## 5. Stats del héroe: lista final y cómo entran en `combat-math`

```
daño = arma(◆) × coef(habilidad, rango) × (1 + Σ[+]) × (1 + 0,01·(Principal de nivel + mainGear)) × crítico × vulnerable × Π[×] (≤ 3)
Σ[+] = % Daño + % Daño de tus ‹cat› (en esa categoría) + addPct de talentos, forja, soportes y aspectos + daño crítico (solo en críticos)
crítico: sale con p = mín(60, critRaw + cb); si sale, su extra sobre el golpe normal × máx(1, (critRaw + cb) / 60)   ← sobrecrítico (v4.2)
```

| Stat | Clave | Saco o capa | Tope | Fuentes |
|---|---|---|---|---|
| Daño de arma | implícito | base | — | arma (◆) |
| Principal | `a[mainStat]` + `mainGear` | ×(1 + 0,01·p) | — | nivel y tablero (con efectos secundarios) · arma y guantes (solo daño) |
| % Daño | `dmgPct` | [+] | — | equipo, talentos, bendición (≤ 28) |
| % Daño de tus ‹cat› | `catDmg` → `mods['@cat'].dmg` | [+] en esa categoría | — | equipo |
| % Crítico | `crit` | probabilidad; lo que pase de 60 hace más fuertes los críticos (sobrecrítico) | 60 en la probabilidad; sin tope en el daño | anillos (≤ 9,3), Des **del nivel**, talentos (c13 10 y el condicional de la especialización, hasta +27 y +20 en una habilidad), tablero (7 / 9 / 12), Era (+10 / +12) |
| % Daño crítico | `critDmg` | [+] solo en críticos | — | equipo, bendición, Glifo de Precisión |
| % Vel. de ataque | `aspdPct` | cadencia del básico | 100 | arma, guantes (≤ 40,5), carcaj, talentos |
| +Rango | `skillLv` (selector) | rango (`rankCoef`: +10 % por rango) | **+1 por selector**, sin tope global | arma, amuleto |
| Aspectos | `itemAgg` | lo que diga su `fx` | regla 4 §4.6 | legendarios |
| Vida | `hp` | vida máx. | — | **implícito de armaduras**, líneas, Rubí, Vit, talentos |
| Armadura | `arm` | K = 60·G(AL) | 75 % | implícito + líneas + Des del nivel |
| % Reducción de daño | `dr` | capa | 50 (Guardián 65) | pecho, cinturón, mano izq. (≤ 20,6), talentos |
| Bloqueo | `block` | capa | 40 (Guardián 50) | escudo |
| Esquiva | `dodgeCdr` | recarga de la esquiva (3 s) | mín. 0,6 s | casco, botas |
| Vida al golpear | `lph` | cubeta de sustento | 6 % de vida/s | arma, pecho, anillos, mano izq. |
| % Enfriamiento | `cdr` | enfriamientos | 50 | casco, mano izq. (≤ 24,9), talentos |
| % Recurso | `resRatePct` (**nueva**) | generado **y** regenerado | — | casco, pecho, cinturón, botas, foco/carcaj |
| % Vel. de movimiento | `spdPct` | velocidad | 50 | **botas (implícito +10)**, aspectos, talentos |
| Fuera del poder | `mf`, `goldPct`, `xpPct` | botín | — | Tormento, collar, bendición |

**Cambios de código que esto exige** (§12):
- **`combat-math.js`:** `ILVL_MAX = 47`; `itemNO(it)`, `effectiveNO(it, nivel)`, `syncProfile(NOz)`, **`lineValue(stat, no, paso, peso)`** (firma nueva: solo el ◆), `noScale(stat, no)` (G o 1,035^◆), `STEP_F = [0.70, 0.775, 0.85, 0.925, 1.0, 1.5]`, `GEAR_K = 1.69`, `GEAR_K_ARM = 1.25`, `K_HP = 5.5`; `tormentMods().quality` pasa a ser el rango ⌊T/4⌋ y se añaden `stepShift` y `starChance`. **v4.2:** `critRoll(critRaw, cb)` → `{ p: mín(60, critRaw + cb), over: máx(1, (critRaw + cb) / 60) }` y `hitDamage(…, crit, over)` multiplica por `over` el extra del crítico (sobrecrítico; `critChance` sigue topando la probabilidad para los efectos «al hacer crítico»); **`ENEMY_P4[AL]`** (vida y daño enemigos por AL, 1 hasta AL 40; la ajusta E4 por IT0) dentro de `enemyHpScale`/`enemyDmgScale` (`combat-math.js:85-93`).
- **`entities.js` `recompute`:** líneas por `lineStats(item, p)` con `main → mainGear`, `catDmg` → `mods`, `skillLv` por selector con tope 1; implícitos de vida y armadura; `spdPct` de botas; `critRaw`, `arm`, `maxMP` con atributos sin equipo; `aggregateAspects`; **solo el primer Mítico cuenta**; fuera calidad, gemas viejas, runas, conjuntos y charms; `st.power` desde `valuation.js` y sin buffs (bug 3.14). `rollDamage` usa `critRoll` y pasa `over` a `hitDamage` (`entities.js:1038-1039`).
- **`resources.js`:** `resRatePct` en `gainResource` y `tickResource`; `resourceMax` deja de sumar `mp` a la Furia y la Energía (bug 3.6).
- **`economy.js`:** `socketGlyph` rechaza un tipo ya engarzado; los repetidos suben rango.

---

## 6. Valoración única (`js/valuation.js`, puro)

- **`deriveStats(p, { equip })`** calcula los stats con un equipo alternativo **sin tocar el `Player` vivo** (bug 3.2).
- **Daño:** DPS de la rotación de la barra con el perfil resuelto. Para cada habilidad, `lanzamientos/s = mín(1/enfriamiento, parte del GCD, (generación + regeneración) / coste)`, repartidos por rendimiento; el básico llena el resto. **La parte de cada categoría** (básicos, gastadoras, Insignia, definitiva) sale de esa rotación y es la que usan «% Daño de tus ‹cat›» y «+1 a tu ‹cat›».
- **Aguante:** `(vida máx + mín(cubeta, sustento/s) × 5 s + escudos/s × 5 s) / mitigación × (1 + 0,25·vel.mov) × (1 + 0,5 / recarga de la esquiva)`. Pesos declarados en `VAL_K`; los ajusta E4 con IT4.
- **⚡ Poder** = 100 · (Daño/D₁)^w · (Aguante/A₁)^(1−w); **D₁ y A₁** = el héroe desnudo de su clase en el Nv1; **w por rol**: `dps` 0,6 · `control` 0,55 · `support` 0,5 · `tank` 0,45. En el modelo [D], un Berserker típico pasa de ≈ 310 (Nv10) a ≈ 910 (Nv30), ≈ 1 800 (Nv50) y ≈ 3 750 (Nv70); el Berserker del mockup (Nv72, bien equipado) tiene 6 260.
- **Veredicto, una sola regla** (R2-4). Con `g = (1+dD)^w · (1+dA)^(1−w) − 1` (el Δ⚡) y **T = percentil 95 del error |g_modelo − g_sim| que mide IT4** (de partida **2 %**):

  | Marca | Condición | Ejemplo (w = 0,6) |
  |---|---|---|
  | **▲▲** | g ≥ 10 % y (peor eje ≥ −3 % o g ≥ 2·\|peor eje\|) | Hoja del Ocaso: +27,6 % / −3,2 % → g +14,2 % |
  | **▲** | g ≥ T y (peor eje ≥ −3 % o g ≥ 2·\|peor eje\|) | Cinturón Tachonado: −2,2 % / +9,2 % → g +2,2 % |
  | **↔** | g ≥ T pero un eje cae más de un 3 % y más de g/2 (un intercambio parejo: decides tú) | +10 % / −7 % → g +2,9 % |
  | **≈** | \|g\| < T | +1 % / −1 % → g +0,2 % |
  | **▼** | g ≤ −T | |
  | **?** | se suma a cualquiera si hay efectos que el modelo no mide | |

  El ejemplo de la v3 (+31,5 % / −6,3 %, Δ⚡ +14,8 %) salía ↔; con esta regla sale ▲▲.
- **Veredicto a potencial (P4-D29, nuevo).** Además de «ahora», el candidato se evalúa **a igual inversión** que la pieza que reemplaza:
  - **rango** = el mayor entre el suyo y el de tu pieza; si llega a r5 sin ★, se suma la **★ media** (un ½ paso de ★ repartido entre sus líneas);
  - **pasos a igual inversión en Afinar** (v4.2, R2-B-4): las líneas del candidato y las de tu pieza se ordenan por valor, y **cada línea del candidato se proyecta al paso de la línea de tu pieza que ocupa su mismo puesto, si es mayor que el suyo** (tu línea con ★ cuenta como paso 5; la ★ ya entra como «★ media»). Afinar es azar, pero con esperanza cerrada: para llegar al paso q hacen falta de media **5 ⁄ (6 − q)** tiradas, sea cual sea el paso de partida (q = 5 → 5; q = 4 → 2,5); el coste se estima con esas tiradas, redondeadas hacia arriba por línea, a 3 500·1,3ᵐ × factor desde m = `af` del candidato. Sin esto, en las horas 20–60 (con tus piezas ya afinadas) lo que cae perdía ≈ 15–20 % solo por los pasos, casi nada salía ▲ ni ⚒ y los filtros volvían a esconder las bases que serían las mejores tras afinar;
  - **tu gema** se mueve si encaja y rinde más que la suya;
  - **tu aspecto** se regraba desde el Códice si el candidato es Raro o Legendario de una ranura con aspecto y el suyo vale menos.
  
  Nunca se proyecta un aspecto que no tienes. Si el veredicto «ahora» no es ▲ y el «a potencial» sí, **la celda lleva ⚒** y el tooltip añade una fila con lo que hay que hacer y su coste: «⚒ ▲ tras mejorar · Daño +4,5 % · Aguante +1,5 % · mejorar a ◆52 · mover tu Esmeralda · 15 900 oro», o, si hay que afinar, «⚒ ▲ tras mejorar y afinar · Daño +… · Aguante +… · mejorar a ◆52 · afinar 2 líneas (≈ 10 tiradas) · ≈ 128 000 oro (1 h)» (unos guantes, factor 0,75: mejora 15 700 + afinar dos líneas al paso 5 desde `af` = 0, 2 625 × Σ1,3ʲ para j = 0…9 ≈ 112 000). Comparo con **tu aspecto regrabado** y no con «el mejor aspecto del Códice»: si no, casi cualquier Raro saldría ⚒ por un aspecto que también puedes grabar en tu pieza actual.
- **Contrato** `score(p, item)` → `{ dmg, agu, g, verdict, pot: { dmg, agu, g, verdict, rank, gem, aspect, steps, cost: { gold, afinar, tiradas } }, unknown }` (`pot.steps` = los pasos proyectados de cada línea; `pot.cost.afinar` = el oro estimado de afinar). La celda, el tooltip, «Mejor para mí» (ordena por el mayor de `g` y `pot.g`), el filtro y el ⚡ usan la misma regla. `test95` afirma: ▲ y ▲▲ ⇒ Δ⚡ ≥ T; ↔ ⇒ Δ⚡ ≥ T y peor eje < −3 %; ▼ ⇒ Δ⚡ ≤ −T; `pot.g ≥ g`; el potencial nunca usa un aspecto que no está en tu Códice; **caso nuevo: tu pieza 5/5/5★ afinada frente a un candidato con mejor tipo de línea a pasos 3/3/3 ⇒ ⚒, con `pot.steps` = 5/5/5 y coste de afinar > 0**; los casos de la tabla.
- **«◆ medio»** del equipo junto al ⚡ en el muñeco (Hazzikostas, sep-2026: «visceral attachment to a certain item level number» [S]).
- **Anillos:** simula los dos reemplazos y enseña el mejor; con Shift, los dos.
- **«▲ para algún héroe»:** cada héroe deja una **ficha de valoración** en la cuenta de su reino; el alijo valora contra las 3 fichas de forma diferida, con caché `(uid, revisión del equipo, revisión de la build)`. Las fichas llevan su pieza por ranura (rango, gema, aspecto y pasos) para el potencial.
- **El mismo modelo** da el `itemValue` del banco. Desaparecen `itemPower` (`ui.js:2548`) y la fórmula de `st.power` (`entities.js:965-971`).

---

## 7. Inventario y UX

### 7.1 Contenedores

| Contenedor | Forma | Ámbito |
|---|---|---|
| Mochila | Rejilla **10×4 = 40**, celdas de 52 px a 1080p (escalan con `--s`); capacidad en una constante | héroe |
| Materiales | **Lista** con pilas de 99: Polvo, Chispas, 6 gemas × 5 grados, soportes, glifos (uno por tipo), llaves, Fragmentos | héroe (Polvo y Chispas: cuenta) |
| Equipo | Muñeco de 10 ranuras (D2) con ◆ naranja en las 6 que llevan aspecto, el ⚡ y el **◆ medio** | héroe |
| Alijo | Pestañas de **50 (10×5)**: 2 gratis y hasta 8 con oro, con nombre, color, icono y afinidad | **cuenta, por reino** |
| Códice | Aspectos por clase y especialización: rango, silueta, coste en Polvo, «subir rango» y el tope de Polvo | **cuenta, por reino** |

### 7.2 Celda (3 superposiciones como máximo)

1. **Borde y fondo de rareza**, más el glifo de forma.
2. **Esquina superior izquierda:** un solo estado: nuevo • > favorito ★ > basura ✕.
3. **Esquina superior derecha:** ▲ (mejora), ▲▲ (mejora mucho), **⚒ (mejora tras invertir)** o el emblema del héroe al que mejora.

### 7.3 Tooltip

- **Compacto (≤ 9 filas, +1 con ⚒):** se ve en §0. Texto ≥ 16 px CSS (18–20 con «Texto grande»).
- **Alt mantenido:** cabecera completa («◆ 45 = ilvl 42 + 3 mejoras»), cada línea con `[mín–máx]`, el paso, [+] o [×] y «se adapta a tu clase», el aspecto con su rango, tu Códice y su Δ, el origen, el Δ⚡ y **la afinidad de tu clase** («tu clase prefiere % crítico»).
- **Shift mantenido:** lo equipado al lado (los dos anillos).
- La palabra de la rareza sale solo las primeras horas, y siempre en Alt.

### 7.4 Teclas y ratón (con un panel abierto)

| Entrada | Acción |
|---|---|
| Clic derecho | Acción principal según el contexto: equipar, guardar en el alijo, vender o poner en la Herrería |
| Ctrl+clic | Mover a la otra ventana abierta |
| Espacio | Marcar o desmarcar como basura ✕ |
| F | Favorito ★ (protege de cualquier lote) |
| Ctrl+C | Copiar el objeto como texto y código (`IRPGI1`) |
| Alt / Shift | Detalle / comparación |
| Arrastrar | Como hoy |

- `contextmenu` con `preventDefault` solo en los paneles; Alt también en *keyup* (Firefox en Windows), a verificar. Rejilla con roles ARIA `grid`, flechas, Inicio y Fin.

### 7.5 Herrería, Códice y cofre

- **Mejorar:** barra de 5 rangos con el ◆ de cada uno y el precio en oro; sin muescas (P4-D27).
- **Re-tirar:** 3 cartas (la tuya y 2 opciones) con su delta simulado.
- **Afinar:** eliges la línea, ves un **dado** grande, el precio y «tirada m en esta pieza»; tras tirar, «Sale 4: la línea sube del paso 3 al 4» o «no supera tu 4». Una línea al 5 o con ★ sale bloqueada.
- **Engarzar:** las 6 gemas por grado; las que no encajan, en gris.
- **Grabar:** el Códice filtrado por las categorías de la ranura; en una armadura, la nota «las armaduras no llevan aspecto».
- **Códice:** cada carta con su rango y «▲ r4 · 75 ✧»; el Mítico con «solo uno activo».
- **Cofre «elige 1 de 3»:** tres cartas con el tooltip compacto y el veredicto.
- **Ritmo** (pantalla de consulta): las 3 metas en horas, de dónde sale y adónde va cada recurso, **la curva de Afinar** (horas de oro por línea), los topes de crítico y la apuesta frente a matar.

### 7.6 Botín en el suelo y filtro

- **Etiquetas en el suelo:** nombre corto con color y glifo para lo que pasa el filtro; **Alt muestra todas**; clic = recoger; pool fijo a 10 Hz con tope de 30 visibles.
- **Filtro en dos niveles:** preajustes (Todo · **Útil para mí** · Solo ▲ · Raro+ · Legendario+) y reglas (≤ 25) con código `IRPGF1`. **«Útil para mí» y «Solo ▲» usan el veredicto a potencial** (▲ o ⚒ para algún héroe tuyo, con mejora, gema, aspecto y pasos afinados a igual inversión): ya no esconden las mejores bases del final del juego.
- **Lo oculto sigue cayendo** y se recoge con Alt. **Autorrecogida:** oro, pociones y materiales siempre; el equipo, según la regla.

### 7.7 Lotes y protección

- «Desguazar marcados» abre un **resumen** («14 objetos → 3 600 de oro»), después un aviso con **Deshacer (10 s)**, y queda la recompra de 12.
- Legendario+ nunca entra en un lote salvo que lo marques; un objeto con ⚒ pide confirmación.

---

## 8. Multijugador en navegador (lo que este paso deja listo)

| Tema | Decisión | Dato |
|---|---|---|
| Confianza | **Dos niveles.** Cooperativo de amigos: confía en los clientes. **Escalera:** reino aparte en el servidor; nada local entra nunca | Modelo D2 Open/Closed [S] |
| Reinos de cuenta | Un almacén por reino: `intentorpg_account:local` y `:hc`. Alijo, Códice, Polvo, Chispas y fichas son **del reino**. La escalera tiene su reino en el servidor, vacío cada temporada; al cerrar, pasa **en un solo sentido** al reino local | P4-D23 |
| Botín | **Personal e instanciado,** con `killLootRng(semillaDelMundo, heroId, netId)` (`paso6` §2.3): **RNG por contador** (un hash de esa clave, no un stream secuencial), así cada cliente tira su botín igual sin depender del orden de las muertes. Hoy el botín sale del stream `'loot'` en el orden de las muertes (`main.js:1231-1233`) [V] | D4 [S], WoW [V]; Salmon et al., «Parallel Random Numbers: As Easy as 1, 2, 3», SC11 (2011) |
| Regalo | Solo dentro del grupo y del botín de esa partida; ventana de 2 h; lo regalado **no se vende** ni se vuelve a regalar. El compañero responde «▲ / ⚒ / ↔ / ▼» (veredicto a potencial). **Transferencia en dos fases** con «en tránsito», `validateItem`, acuse y vuelta a los 30 s; el receptor descarta un `uid` repetido. **El oro y el Polvo no se regalan** | WoW, D3, Last Epoch (duplicación de oro, 2025) [S] |
| Comercio | Ninguno (P4-D18) | — |
| Identidad | `accountId` y `heroId` en la migración v6; **`uid` global**; `origen: { reino, partida }` **solo informativo**: vive en el guardado local y cualquiera lo edita, así que **no prueba nada**. Ninguna regla lo usa como prueba: la escalera no lo lee (su reino vive en el servidor y nada local entra). Si algún día hace falta probar un origen, lo **firma el servidor** (HMAC) y el cliente no puede fabricarlo (INV-B-2) | Hoy el `uid` es un contador local |
| Varias pestañas | Escrituras de la cuenta dentro de `navigator.locks.request('irpg-cuenta:<reino>')` con `rev` y relectura; `BroadcastChannel('irpg')`; la 2.ª pestaña, **solo lectura**; `uid` reservado en bloques de 64 | Web Locks: Chrome 69, Firefox 96, Safari 15.4 [S] |
| **Validación de objeto** | `validateItem(compacto)` puro: base existe, ◆ ≤ 52, líneas del pool de la ranura sin repetir, selector válido para la ranura, pasos 1–6 (una ★ salvo Mítico), gema que encaja, aspecto del catálogo **solo en ranura con aspecto** y con categoría válida, rango 1–5, Único/Mítico del catálogo, **contadores `rr` ≤ 6, `af` y `sm` enteros ≥ 0**, números finitos | `paso6` §5.4 |
| **Validación de equipo** (nuevo) | `validateLoadout(héroe)`: **un Mítico activo**, **un glifo por tipo**, «+1» con tope por selector, aspectos duplicados inactivos, ranuras y clases correctas. La usan `recompute` (para no confiar en el guardado) y el saneado del Paso 6 cuando un compañero se une con su héroe | Un cliente modificado podría mandar 9 Míticos o 4 Precisiones |
| Nombres | Los textos **nunca viajan**: `nameOf(seed, base)` y catálogo | `paso6` §5.4 (XSS) |
| Determinismo | Semilla por objeto (re-tirada, Afinar, ★) y por cuenta (apuesta); en la escalera, las guarda el servidor. **El precio de la apuesta es una tabla fija por tramo de nivel**, no una medida en vivo de cada cliente, para que todos y el servidor de la escalera den el mismo número. **Alcance (INV-B-2):** esto hace reproducibles **el crafteo, la apuesta y el botín por muerte**, no **la partida**: hoy el paso de tiempo es variable (`main.js:1545`), la IA, los respawns y el tipo de goblin usan `Math.random` (`entities.js:2616-2695, 2982`; `game-zone-life.js:47-86, 159`) [V] y `Math.pow`/`sin` pueden dar distinto en otro motor JS. **Ninguna regla de este paso valida una carrera repitiendo su semilla.** La autoridad de la escalera es del Paso 6 (D12): «de honor» en F2 (el cliente simula) y grieta verificada en F3 (`detmath`, paso fijo, re-simulación en el servidor y build fija) | Bug 3.15; Rune, *Making JS deterministic* (2024) [S]; WebKit 150403 (`Math.pow` distinto entre Chrome y Safari) [S] |
| Formato | Compacto y canónico (§9.1) | Bug 3.12 |
| Sincronización | Perfil de §4.2; con el valor función del ◆, el recorte `mín(◆, NOz + 2)` es exacto | FFXIV [V en `arpg.md`] |
| Pausa | Solo en solitario (P4-D20) | Nacke 2023 [V] |
| Alijo | La importación entra en la pestaña «Importado» del reino local | Hoy la pisa (`main.js:344`) |
| Autoridad barata (futuro) | Durable Objects de Cloudflare (plan gratis) | `actual.md` §7.8 [V] |

---

## 9. Formato de objeto y migración

### 9.1 Formato compacto (`sv: 4`)

```js
{ u: 'k3x9q-0042', b: 'hacha_guerra', n: 42, r: 'L', k: 3,          // uid, base, ilvl, rareza, rango
  L: [['main', 5], ['critDmg', 6], ['catDmg', 3, 'sp']],             // [línea, paso, selector?] ×3 (6 = ★)
  g: ['topacio', 4],                                                  // ◇ [gema, grado] | null
  a: ['x_molino_huesos', 3],                                          // [aspecto, rango] | null (solo ranuras con aspecto)
  q: null,                                                            // id de Único/Mítico | null
  s: 918273645, x: 1, rr: 2, af: 4, sm: 1,                            // semilla, línea re-tirada, re-tiradas, afinados, ★ movidas
  o: { realm: 'local', run: null }, f: 3, t: 0 }                      // origen, banderas, regalo hasta
```

- **≈ 160 bytes por objeto** [D, lo mide `test94`]; 8 pestañas × 50 ≈ 64 KB por reino.

### 9.2 Migración v5 → v6 (`MIGRATIONS[5]`, `SAVE_VERSION = 6`)

1. **Respaldo** `<slot>.bak-v5` y `intentorpg_stash.bak`.
2. **Identidad:** `accountId` (una vez por navegador) y `heroId` por héroe; el Paso 6 no sube la versión por eso.
3. **Cada objeto, en un orden fijo e idempotente:**
   - Rareza: `conjunto` → `raro`; `relic` → Único; míticos, §4.8. **Legendario en casco, pecho, cinturón o botas → Raro**; su aspecto, al Códice (+5 de Polvo).
   - **Paso de cada afijo:** `clamp(1 + ⌊5·(v − mín)/(máx − mín + ε)⌋, 1, 5)`; ★ → paso 6.
   - **Afijos que cambian:** Fuerza, Destreza y Energía → Principal **solo en arma y guantes**; Vitalidad → Vida; % elemento → «% daño de tus gastadoras»; % coste → % Recurso; crítico fuera de los anillos → % daño crítico; velocidad de movimiento, maná, hallazgo mágico, maná al golpear, espinas y líneas sin sitio → **re-tiradas** del pool con `hash(uid)` y el mismo paso.
   - Calidad → rango. Gemas y runas: §4.8. Se identifica todo. `validateItem` sobre cada uno.
4. **Ranuras retiradas** (P4-D1 = b, aprobada): desguace con doble reembolso, aspecto al Códice y aviso.
5. **Cuenta** (`intentorpg_account:local` v1, o `:hc`): alijo en pestañas, unión de los Códices, Polvo inicial = 5 × legendarios del alijo (con el tope), Chispas por Míticos rehechos.
6. **Bendiciones** recalculadas con el tope de nivel 10. **Glifos:** el mejor de cada tipo queda; los repetidos le suben rango; Precisión → daño crítico.
7. **`validateLoadout`** sobre cada héroe: si lleva dos Míticos, el segundo vuelve a la mochila.
8. **Avisos** agrupados en `LOAD_NOTICES`: «Tu equipo se adaptó al nuevo sistema: 3 charms → 1 500 de oro · 2 hombreras → Códice · tu crítico bajó (la Destreza del equipo ya no lo da)».

**Pruebas:** `test97-guardado-v6` con los saves v5 reales de E0.2 (3 clases × Nv {5, 20, 40, 60, 80, 100}): idempotencia, ningún legendario perdido sin su aspecto en el Códice, ⚡ antes/después dentro de ±25 %, alijo intacto en número de objetos, todo pasa `validateItem` y `validateLoadout`.

---

## 10. Banco de balance y calibración E4b

**Qué cambia en el banco** (`tests/helpers/bench-core.mjs`, `tests/balance-bench.mjs`):

| Hoy | Paso 4 |
|---|---|
| 12 `SLOTS`; `generateItem(il, rareza, kind, …)` + `gearProfile` + `itemValue` | 10 ranuras; `generateItem(ilvl, rango, rareza, ranura, { cls, spec, rng })`; **perfiles**: `desnudo` (blancos con su implícito), `tipico` (raros, paso medio 3, gema grado 3, rango ⌊T/4⌋), `optimo` (legendarios con `ASPECT_RECO[spec]` en las 6 ranuras con aspecto, pasos 4–5, gemas grado 5, rango 5, 1 ★) |
| `itemValue` con sesgo de atributos | `valuation.score` |
| Poderes fijos `furia`, `volatil`, `multidisparo` | aspectos recomendados por especialización |
| Bendiciones L = (Nv−20)/3 | **L ≤ 10** |
| Calidad por Tormento | rango ⌊T/4⌋ |

**Reglas nuevas:**

| Regla | Qué afirma |
|---|---|
| **IT0** (anclaje, v4.2; se cumple **antes** del rebase de `PENDING_E4B`) | (i) El **típico del Nv50 rinde lo mismo que hoy ±10 % en DPS y en Aguante** (hoy = el perfil típico del banco actual, con el mismo saco fuera del equipo). E4 lo cierra con los implícitos (`GEAR_K`, `K_HP`, `GEAR_K_ARM`) y los topes de las líneas en la misma proporción, para que O6 e IT6 sigan en banda. (ii) **Del Nv58 al 100, el TTK (común, élite y jefe) y el TTD del típico de cada clase quedan a ±15 % de los del banco de hoy en su AL**; lo que falte lo absorbe la tabla **`ENEMY_P4[AL]`** (vida y daño enemigos, 1 hasta AL 40). Por esto nunca se toca una clase (eso es E4b) |
| **IT1** | Cuota del equipo en banda (O6), en DPS y en vida efectiva (el ancla absoluta es IT0; la v4.1 pedía «vida típica del Nv70 = hoy ±10 %», que choca con IT0 porque hoy la vida se congela en il40) |
| **IT2** | Del Nv58 al 70 el DPS del típico crece ×1,45–1,85 **por el equipo** (modelo v4.2: ×1,75–1,78; hoy ×1,00, con el equipo congelado en il40 mientras la vida enemiga crece ×1,84): el equipo vuelve a importar en ese tramo |
| **IT3** | Con el óptimo y **todas las fuentes en su estado normal**, por especialización (talentos al rango de la build recomendada que más suma, tablero, Era y crítico condicional: `condCrit`, `tv` y `verbStats`), **cada línea de crítico conserva ≥ 80 % de su Δ⚡ marginal sin tope**, medido en la tirada (`critRoll(critRaw, cb)` con el sobrecrítico), no en `stats.crit`. `valuation.js` y `calc-r2.mjs` usan la misma función. Modelo v4.2 (`out-r2.txt` (7)): sobrecrítico 1,00 en las 9; con el crítico ya por encima de 60, tope duro de hoy 0 y «+2 de daño crítico por punto» 0,46–0,58 (si la línea solo cruza el 60: 0,24–0,88 y 0,58–0,94). El resto de las líneas ≤ 60 % de `CAPS`; una línea de vida al golpear no llena la cubeta en UNI |
| **IT4** | El veredicto del modelo coincide en signo con la simulación en ≥ 95 % de 200 pares por clase **fuera de la zona ±T**, incluidos pares que solo difieren en recurso, vida al golpear, esquiva o ‹cat›. **Mide T** = percentil 95 de \|g_modelo − g_sim\| |
| **IT5** | Óptimo frente a típico en [1,3; 15] |
| **IT6** | Paridad **por especialización y por eje**, con el crítico de cada especialización en su estado normal (§4.4): cada línea a ±20 % de la mediana de su eje en los Nv50, 70 y 100; las afinidades declaradas (crítico / daño crítico, por especialización), a ±50 % y visibles en Alt; las gemas de una misma ranura, ±20 % |
| **IT6b** | Paridad **por pool en ⚡**: toda línea de un pool a ±20 % en g (w = 0,55) de la mediana del pool, para cada especialización en el Nv70, salvo afinidad declarada |
| **IT7** | Ritmo (`loot-bench`): metas de §4.13 ±30 %; **tasa efectiva por fuente** (caída, élites, jefe de piso, cofre de grieta, apuesta, mercader y grabado) con la **política óptima de conversión** del oro (todo a la fuente más barata de cada cosa; es el caso «cubo óptimo» que hoy falta en `tests/loot-regression.mjs`, que solo mide caídas por piso): **ninguna fuente pagada con oro da más de 0,5 × matar en bases Raro+ por ranura y hora; la apuesta, además, ≤ 0,5 × matar en legendarios por ranura y hora; el grabado queda fuera de esa cuota** porque solo copia un aspecto que ya está en el Códice (§4.11); **ninguna fuente da aspectos o rangos nuevos por hora fuera de la meta**; oro sin gastar ≤ 2 h de ingresos entre las horas 2 y 60; Polvo sin topar antes de la hora 20; gemas Perfectas no antes de 7 h; un aspecto concreto ≤ 5 legendarios |
| **F10** | Paridad de variantes con aspectos y Δ declarado de cada aspecto dentro de ±30 % de lo medido |

**Impacto esperado del arma, sola** (modelo [D] de la v3, `calc-r1.mjs`, que no está en esta carpeta; en la v4.1 lo comprobé a mano: hoy = 3·G(il)·statMult·1,35, v4 = 3·G(◆)·1,69; el arma ya escalaba solo con el ◆; **el héroe entero está en la tabla siguiente**):

| Arma (media) | Hoy | v4 (`GEAR_K` 1,69) | Δ |
|---|---|---|---|
| Típico Nv50 (il 36, raro) | 45,9 | 45,9 | ±0 % |
| Óptimo Nv50 (rango 5) | 73,7 | 62,9 | −15 % |
| Típico Nv70 y Nv100 (hoy il 40; v4 il 47) | 59,0 | 91,9 | +56 % (efecto de `ILVL_MAX`) |
| Óptimo Nv70 y Nv100 | 94,8 | 125,8 | +33 % |

**Frente a hoy: el héroe entero** (v4.2, R1-B-3; modelo [D] `calc-r2.mjs` (8)). «Hoy» es una réplica del perfil del banco actual: `generateItem` de `items.js:196-272` (raro ×1,25 con 3–4 afijos principales + 1 secundario; legendario ×1,5 con 4–5 + 1–2; ★ 8 %; atributos 1 + 0,12·(il − 1), planos con G) y `gearProfile` de `bench-core.mjs:81-109` (el mejor de 3 raros por `itemValue` en el típico; de 12 legendarios con el principal ×2 en el óptimo; mediana del daño y la armadura, media de los afijos), 12 ranuras, il = mín(40, AL), sin gemas; calidad 0 en el típico y 5 en el óptimo (×1,30 al arma, la armadura y los afijos, `entities.js:798-800, 915`). Mismo saco fuera del equipo en los dos (típico 60; óptimo 140 = 60 + soportes 80, más las bendiciones: hoy L = (Nv − 20)/3, v4 L ≤ 10). Sin aspectos ni poderes legendarios en ninguno. Rango de las 3 clases:

| Perfil | Nv | DPS v4 / hoy | Aguante v4 / hoy | Arma | Atributo principal | Crítico v4 · hoy | Vida v4 · hoy |
|---|---|---|---|---|---|---|---|
| Típico | 50 | **×0,67–0,73** | **×0,50–0,54** | ×0,95–0,98 | ×0,77–0,78 | 18–28 · 40–52 | 994–1 071 · 1 415–1 547 |
| Típico | 58 | ×0,70–0,74 | ×0,51–0,53 | ×0,93–0,97 | ×0,76–0,78 | 18–28 · 41–52 | 1 179–1 272 · 1 744–1 813 |
| Típico | 70 | **×1,23–1,31** | ×0,80–0,85 | ×1,45–1,51 | ×0,76–0,78 | 19–29 · 41–52 | 1 610–1 727 · 1 816–1 885 |
| Típico | 100 | ×1,28–1,41 | ×0,80–0,86 | ×1,45–1,51 | ×0,76–0,78 | 26–41 · 48–64 | 1 730–1 907 · 1 963–2 065 |
| Óptimo | 50 | ×0,26–0,29 | ×0,31–0,34 | ×0,77–0,78 | ×0,50–0,51 | 19–29 · 59–89 | 1 446–1 523 · 3 058–3 201 |
| Óptimo | 58 | ×0,27–0,30 | ×0,29–0,33 | ×0,76–0,77 | ×0,50–0,52 | 19–29 · 63–85 | 1 718–1 811 · 3 952–4 090 |
| Óptimo | 70 | ×0,48–0,54 | ×0,50–0,57 | ×1,19–1,20 | ×0,50–0,52 | 20–30 · 63–85 | 2 364–2 481 · 4 072–4 210 |
| Óptimo | 100 | ×0,49–0,57 | ×0,50–0,57 | ×1,19–1,20 | ×0,50–0,52 | 27–42 · 71–97 | 2 484–2 661 · 4 322–4 510 |

- **Lo que dice:** el arma es la misma que hoy en el Nv50, pero el héroe no. Hoy el equipo trae los cuatro atributos en casi todas las piezas (≈ 53–62 de cada uno en el típico del Nv70), ≈ 16 de crítico, ≈ 40 % de daño, ≈ 1 100 de vida y ≈ 86 de vida al golpear (la cubeta de sustento siempre llena). La v4 quita esa sopa a propósito (O5, P4-D3, P4-D5), y con los números de partida **el típico del Nv50–58 queda en ≈ 0,7 de DPS y ≈ 0,5 de Aguante**; del Nv70 en adelante el arma (+47–51 %, efecto de `ILVL_MAX`) le da la vuelta al DPS. El óptimo pierde mucho más (hoy: 12 legendarios con calidad 5 y bendiciones sin tope): el abanico óptimo/típico se estrecha ≈ 2,5 veces; IT5 lo vigila.
- **Por qué no lo veía nada:** O6 e IT1–IT7 son relativas (cuotas frente a blancos con el mismo implícito, ritmos, paridades) y pasarían igual. **IT0 es la regla que lo ve.**
- **Qué hace E4 con esto (IT0):** (i) sube los implícitos hasta que el típico del Nv50 rinda como hoy (el modelo pide ≈ ×1,4–1,5 de DPS y ≈ ×1,9–2,0 de Aguante). En el DPS basta `GEAR_K` y la cuota de líneas de O6 no cambia, porque las líneas % multiplican al arma; en el Aguante, `K_HP` y `GEAR_K_ARM` suben junto con los topes de las líneas planas (Vida, Armadura, Vida al golpear) para que la cuota de líneas siga en banda; (ii) del Nv58 en adelante, ajusta `ENEMY_P4` para que el TTK y el TTD queden como hoy. Con (i) hecho, el modelo estima `ENEMY_P4` ≈ ×1,7–2,0 de vida y ≈ ×1,5–1,7 de daño en AL 47–50, en rampa desde AL 41 [D, a mano sobre esta tabla].
- **Quién absorbe el salto del Nv58 al 70 (decisión v4.2, P4-D2 y R5):** **la vida y el daño de los enemigos de AL 41–50 (`ENEMY_P4`), no las clases.** Razones: (1) el salto depende del nivel (sale de `ILVL_MAX` y del ◆52), y E4b calibra clases y especializaciones, no niveles; (2) la calibración del Paso 2 en los Nv70 y 100 (`G9_LEVELS`, `balance-bench.mjs:118`) se hizo con el equipo congelado en il40 mientras la vida enemiga crecía ×1,84 (G^1,38, `combat-math.js:85-92`); con `ENEMY_P4` esa calibración sigue valiendo; (3) el jugador lo vive como «el equipo vuelve a importar entre el 58 y el 70»: si mejoras el equipo, el TTK es el de hoy; si no, te quedas atrás. La alternativa (recalibrar clases con un número declarado) queda en §14 como opción no recomendada.

**Cuotas y vida** (modelo [D] v4.2, `calc-r2.mjs`; líneas = 1 − valor(blancos con implícito)/valor(perfil); equipo entero = frente al héroe sin nada; el Aguante cuenta vida, armadura frente a K = 60·G(AL), reducción de daño, bloqueo, sustento, movimiento y esquiva):

| Perfil | DPS (líneas) | Aguante (líneas) | Aguante (equipo entero) | Vida |
|---|---|---|---|---|
| Típico Nv20 | 20–23 % (Guerrero 19,6) | 32–34 % | 56–60 % | 512–538 |
| Típico Nv50 | 35–39 % | 42–45 % | 69–74 % | 994–1 071 |
| Típico Nv70 | 46–50 % | 49–52 % | 78–82 % | **1 610–1 727** (réplica del banco de hoy: 1 816–1 885) |
| Óptimo Nv100 | 54–59 % | 59–63 % | 83–87 % | 2 334–2 511 |

- **v4.1:** con el crítico de talentos bien contado (0 en el Nv20, +10 desde el Nv50) el DPS de las líneas sube ≈ 1 punto desde el Nv50 y baja ≈ 1 en el Nv20; el Guerrero del Nv20 queda 0,4 puntos bajo la banda de O6 (dentro del error del modelo: IT1 decide). **v4.2:** el tablero bien contado sube ≈ 0,6 puntos el DPS de las líneas del óptimo del Guerrero y la Maga; el resto no cambia (el crítico condicional de cada especialización solo mueve la paridad del crítico y el daño crítico, §4.4).

- **Sin `HP_P4_COMP`:** la vida implícita crece con G como el daño enemigo (G^0,85), así que no hace falta tocar `hpPerLevel` (P4-D22). Que su nivel absoluto sea el de hoy lo decide IT0, no esta tabla.
- **Nota de método:** el modelo v3 usaba 1,69 para la armadura implícita; el v4 usa 1,25, como dice §4.1.

**Reparto del trabajo:** E4 de este paso ajusta **constantes de ítems** (`GEAR_K`, `GEAR_K_ARM`, `K_HP`, topes de las líneas, pesos, ritmo, tabla de precios de la apuesta, costes de Afinar) y la **tabla de anclaje `ENEMY_P4`** (vida y daño enemigos de AL 41–50) hasta que IT0–IT7 queden en banda, **IT0 primero**. **`PENDING_E4B`** (95 entradas) se **rebasa** al cierre, con IT0 ya cumplida; el rebase recoge además lo que cambia el sobrecrítico (§4.4). **E4b** calibra clases y especializaciones.

---

## 11. Riesgos y mitigación

| # | Riesgo | Prob. · Impacto | Mitigación |
|---|---|---|---|
| R1 | **Alcance** (items, economy, entities, ui, main y el banco a la vez) | Alta · Alto | Etapas con dueños exclusivos (§12), stubs antes de E1, cuarentena vacía al cierre |
| R2 | **La migración pierde algo valioso** | Media · Alto | Saves reales, respaldo, aspecto siempre al Códice, doble reembolso, `validateItem`/`validateLoadout`, idempotencia |
| R3 | **Los aspectos rompen la paridad de variantes** | Media · Medio | Δ declarado, F10, ≤ 2 «V» en habilidades distintas |
| R4 | **CPU del modelo único** (ahora con el potencial: 2 evaluaciones por candidato) | Media · Medio | `deriveStats` sin DOM, caché, `requestIdleCallback`, ≤ 2 ms por fotograma; medir en E3 |
| R5 | **Quitar `statMult` y la sopa de afijos, topar bendiciones, mover la vida al implícito y subir `ILVL_MAX`** mueven todo el banco | **Alta · Alto** (v4.2: medido) | Tamaño conocido (§10 «Frente a hoy»: típico del Nv50 ×0,67–0,73 de DPS y ×0,50–0,54 de Aguante; del Nv70, ×1,23–1,41 de DPS). IT0 lo cierra antes del rebase: implícitos y topes para el Nv50, `ENEMY_P4` para AL 41–50; las clases no se tocan por esto (E4b) |
| R6 | **10 ranuras** o **6 con aspecto** se sienten pobres en el juego | Baja · Bajo | Aprobadas por el dueño (P4-D1, P4-D25, 22-oct); el dato admite más si las capturas de E3 lo piden |
| R7 | **Volumen de contenido** (54 aspectos + 10 Únicos + 9 Míticos) | Media · Medio | Igual que la v3 (P4-D25 evita los ≈ 78 de la otra opción) |
| R8 | **Arte** (iconos por base, Polvo, Chispas, dado) | Alta · Bajo | Tanda de Codex con refutación de arte; hasta entonces, `eq_*` con tinte |
| R9 | **Alt y clic derecho en el navegador** | Media · Bajo | `preventDefault`, Chrome y Firefox, remapeo |
| R10 | **Inflación de oro** (sin comercio) | Media · Bajo | Sumideros que crecen (Afinar, ★) e IT7 «oro sin gastar ≤ 2 h» |
| R11 | **Dos sistemas** (forja de habilidades y Herrería) | Media · Medio | Nombres distintos y ✦ en la variante potenciada |
| R12 | `ui.js` compartido y enorme | Alta · Medio | Módulos propios; `ui.js` solo los monta |
| R13 | **El modelo [D] se equivoca** (paridad, cuotas, horas, la réplica «hoy») | Media · Medio | Son de partida: IT0 (con la línea base medida de E0.6), IT1, IT3, IT6, IT6b e IT7 con el banco real deciden |
| R14 | **Dos pestañas** escriben la cuenta a la vez | Baja · Alto | Web Locks + `rev` + solo lectura |
| R15 | **Afinar se siente como tragaperras** (nuevo) | Media · Medio | Nunca baja, precio a la vista, dado con resultado fijado por semilla, curva en la pantalla Ritmo |
| R16 | **El ⚒ confunde** (nuevo) | Baja · Bajo | Solo aparece cuando cambia la respuesta; la fila dice qué hacer (mejorar, afinar, mover la gema) y cuánto cuesta |
| R17 | **Las armaduras se sienten planas sin aspecto** (nuevo) | Media · Medio | Vida y Armadura implícitas que crecen con el ◆, ≥ 1 Único por armadura, ★ y Afinar; P4-D25 aprobada por el dueño (22-oct) |
| R18 | **Capas de crafteo que se suman sin criterio** (v4.1, INV-B-3) | Media · Medio | MVP cerrado de §4.9; una capa nueva entra solo con el criterio de §12.4 (hueco medido por `loot-bench`) |
| R19 | **Algo del cliente se toma como prueba** (`origen`, semillas) (v4.1, INV-B-2) | Baja · Alto | `origen` solo informativo; ninguna regla valida carreras por semilla; la autoridad de la escalera es del Paso 6 (D12) |
| R20 | **El crítico vuelve a topar** por una fuente que el modelo no contó (v4.1, R1-B-2; v4.2: pasó con el crítico condicional y los nodos mágicos del tablero) | Media · Medio | **Sobrecrítico** en el contrato de E0.1: lo que pase de 60 no se pierde, así que una fuente nueva nunca deja líneas muertas; IT3 por especialización con todas las fuentes en su estado normal, medido en la tirada |
| R21 | **`ENEMY_P4` cambia la dificultad de AL 41–50** para todo el mundo (v4.2, R1-B-3) | Media · Medio | Una sola tabla por AL en `combat-math.js` (1 hasta AL 40: la nivelación no cambia), medida por el banco contra el TTK y el TTD de hoy; el humo `full` la recorre; si el dueño prefiere que el tramo 58–70 se sienta más rápido que hoy, se baja la tabla y se deja a la vista |
| R22 | **El naranja pierde brillo cuando el Códice se llena** (v4.2, INV-B-1: Grabar sobre un Raro sin material escaso) | Media · Medio | La persecución pasa a la base (◆, pasos, ★ con el Tormento), los Únicos y los Míticos; IT7 mide aspectos y rangos nuevos por hora; si el dueño quiere que el legendario siga contando, la opción b2 de §14 (+5 de Polvo al grabar en un Raro) |

---

## 12. Plan por etapas

### 12.0 Mapa de dependencias

```
E0 Preparación ──► E1 Motores (W1 ∥ W2 ∥ W3) ──► E1.5 Integración ──┬─► E2 Contenido (KI ×3 ∥ KU) ──┬─► E4 Banco (B1) ──► E5 Migración final y cierre
  P1 ∥ P2 ∥ P3 ∥ P4 ∥ P5                                            ├─► E2b Economía (EC) ───────────┤
                                                                    └─► E3 Interfaz (U1 ∥ U2 ∥ U3 → U4) ┘
```

- **Antes de E0.1:** la verificación de las altas ya se hizo (`refutaciones/verificacion-altas.md`) y la v4.2 la atiende (§13.0b). Las decisiones de §3 y las 12 preguntas de §14 están aprobadas; las 3 recomendaciones nuevas de §14 valen mientras el dueño no diga otra cosa. **E0.6 guarda la línea base «hoy» medida** (TTK, TTD, DPS y Aguante del típico por clase en los Nv50, 58, 70 y 100) como referencia de IT0, antes de tocar nada.
- **Rama:** `paso4-items`, desde `claude/isometric-rpg-game-xmer7p` cuando el Paso 2 esté publicado. Cada trabajador en su worktree; el orquestador fusiona.
- **Modelos** (regla del dueño): Sonnet para lo mecánico, Opus para implementar, el modelo principal solo para orquestar y juzgar. Tras cada ola, juicio del diff; lo deficiente vuelve **al mismo** trabajador; reintentos en un workflow **nuevo** solo con los fallidos.
- **Pruebas pesadas por turno** (`tools/turno.mjs`); un workflow a la vez.
- **Coordinación con el Paso 6:** `heroId`, `killLootRng`, `validateItem`/`validateLoadout`/`sanitizeItem` y la clave del reino se acuerdan en E0.1 (§3.4 y §5.4 de `paso6`).

### E0 · Preparación (bloquea todo) · ~0,5 día

| Tarea | Quién | Archivos (dueño exclusivo) | Entrega |
|---|---|---|---|
| E0.1 Contratos | Orq. | este documento → `docs/paso4-items.md`, `tests/run.mjs` (cuarentena), `tests/pending-p4.json` | Contratos fijados (abajo); rama creada |
| E0.2 Saves v5 reales | P1 · Sonnet | `tools/make-v5-saves.mjs`, `tests/fixtures/saves-v5-items.json`, `tests/fixtures/catalog-items-v2.json` | Saves deterministas con todo lo que se migra (Hardcore, Arquera con Destreza en el equipo, legendarios en armaduras, glifos repetidos, dos Míticos) |
| E0.3 Arreglos que no dependen del diseño | P2 · Opus | `js/items.js`, `js/economy.js`, `js/game-endgame.js`, `js/powers-common.js`, `js/ui.js` (solo `_previewEquip` y el flotante ⚡), `tests/test90-items-arreglos.mjs` | Bugs 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8 y 3.14. **Se publican antes del rework** (✅ aprobado por el dueño, 22-oct, §14 pregunta 12) |
| E0.4 Azar con semilla en economía y bendiciones | P3 · Opus | `js/economy.js` (después de P2), `js/game-endgame.js`, `js/rng.js`, `tests/test91-economia-semilla.mjs` | Bug 3.15 |
| E0.5 Stubs y registro | P4 · Sonnet | `sw.js` (`ASSETS` con todas las rutas nuevas) y archivos vacíos con cabecera y exports: `js/item-defs.js`, `js/item-gen.js`, `js/item-format.js` (`validateItem`, `validateLoadout`, `nameOf`), `js/valuation.js`, `js/account-store.js`, `js/aspects.js`, `js/aspects-<clase>.js` ×3, `js/aspects-common.js`, `js/powers-aspects-<clase>.js` ×3, `js/crafting.js`, `js/loot-filter.js`, `js/ground-labels.js`, `js/game-items.js`, `js/ui-inventory.js`, `js/ui-crafting.js`, `js/item-tooltip.js`, `js/inventory-view.js`, `css/inventory.css`, `css/crafting.css` | `test71` sigue en verde |
| E0.6 Línea base «hoy» (v4.2, IT0) | P5 · Sonnet | `tests/fixtures/baseline-hoy-p4.json` | TTK (común, élite, jefe), TTD, DPS y Aguante del típico y del óptimo por clase en los Nv50, 58, 70 y 100, con el código de `paso2-impl` y `balance-bench` por turno (`node tools/turno.mjs node tests/balance-bench.mjs …`); sin tocar el banco |

**Contratos fijos antes de E1:** formato compacto (§9.1); `validateItem` (con selector, `af`, `sm`, aspecto solo en ranura con aspecto) y `validateLoadout`; **`lineValue(stat, no, paso, peso)`** (solo el ◆), `itemNO`, `effectiveNO`, `syncProfile`, `deriveStats(p, { equip })`, **`score(p, item)` → `{ dmg, agu, g, verdict, pot: { …, steps, cost: { gold, afinar, tiradas } }, unknown }`**; **`critRoll(critRaw, cb)` y `hitDamage(…, crit, over)` (sobrecrítico, §4.4 y §5)**; **`ENEMY_P4[AL]`** (1 por defecto; la llena E4); esquema del almacén de cuenta con reino, `rev` y cerrojo; `defineAspect` con `steps` y `delta`; `itemAgg.gaugeStats`; **la tabla de pools y topes de §4.1 y §4.4** (con las 6 ranuras con aspecto).

### E1 · Motores (W1 ∥ W2 ∥ W3) · ~1,5–2 días

| Trabajador | Archivos (dueño exclusivo) | Qué hace | Pruebas nuevas |
|---|---|---|---|
| **W1 · Ítems** (Opus) | `js/item-defs.js`, `js/item-gen.js`, `js/item-format.js`, `js/items.js` (fachada), `js/combat-math.js`, `js/resources.js`, `js/entities.js` (equipo de `recompute`, constructor, `resourceMax` y la tirada de `rollDamage` para el sobrecrítico) | Bases y 10 ranuras (6 con aspecto), implícitos de arma, armadura, **vida** y botas, pools v4, `lineValue` por ◆, pasos y ★, rarezas, gemas como ◇, Únicos y Míticos como datos (solo uno activo), `generateItem`/`rollDrops`, ◆ efectivo y `syncProfile`, Tormento (⌊T/4⌋, pasos y ★ al caer), `ILVL_MAX = 47`, `mainGear`, `catDmg`, `resRatePct`, `skillLv` por selector, **sobrecrítico** (`critRoll`, `hitDamage` con `over`) y `ENEMY_P4` vacía (todo 1), formato ⇄ vivo, `validateItem`, `validateLoadout`, `nameOf`, `uid` global | `test92-items-gen` (pools, grupos exclusivos, **mismo ◆ ⇒ mismo valor**, ninguna combinación legal deja una línea en 0, topes de IT3), `test93-items-recompute` (simetría de `mainGear`, un Mítico activo, `catDmg` y `skillLv` por selector, **sobrecrítico: el daño esperado es lineal en el crítico por encima de 60 y la probabilidad no pasa de 60**), `test94-item-format`, `test-sync` |
| **W2 · Valoración** (Opus) | `js/valuation.js`, `js/entities.js` (solo `st.power`, por la cola W1), `tests/helpers/bench-core.mjs` (solo `itemValue` → `valuation`) | `deriveStats`, Daño con rotación y parte por categoría, Aguante, ⚡ con D₁/A₁ y w por rol, **veredicto con ▲▲ y regla del peor eje**, **potencial** (rango, ★ media, **pasos a igual inversión en Afinar**, gema movida, aspecto regrabado, coste con `afinar`), anillos, fichas (con pasos), caché | `test95-valoracion` (pureza; reglas de §6; `pot.g ≥ g`; el potencial no inventa aspectos; **5/5/5★ afinada frente a 3/3/3 con mejor tipo de línea ⇒ ⚒ con coste de afinar**; `mf` no cuenta; el ⚡ crece con el nivel) |
| **W3 · Cuenta y guardado** (Opus) | `js/account-store.js`, `js/save-schema.js`, `js/save-legacy-items.js`, `js/main.js` (carga, guardado e importación) | Almacén por reino con `rev`, Web Locks, `BroadcastChannel` y solo lectura; `uid` por bloques; `SAVE_VERSION = 6`, `accountId`/`heroId`, `MIGRATIONS[5]` (§9.2) | `test96-cuenta`, `test97-guardado-v6` |

### E1.5 · Integración · ~0,5 día

- Fusión de W1, W2 y W3. `js/aspects.js`: `defineAspect`, `aggregateAspects`, rangos, umbrales, `ASPECT_RECO`.
- Mixin **`js/game-items.js`**: `g.salvage`, `g.upgradeItem`, `g.moveStar`, `g.rerollLine`, **`g.refineLine`** (Afinar), `g.socketGem`, `g.imprintAspect`, `g.gamble`, `g.openBossChest`, `g.buyAspect`, `g.rankUpAspect`, `g.craftMythic`, `g.giftOffer`/`g.giftAccept` (esqueletos); registrados en `Object.assign` y `test43-mixins`.
- **Terminado cuando:** `npm test` verde con la cuarentena listada y el humo `boot` arranca héroes Nv1, 20 y 70 de las 3 clases con equipo nuevo.

### E2 · Contenido (KI-guerrero ∥ KI-maga ∥ KI-arquera ∥ KU) · ~1–1,5 días

| Trabajador | Archivos | Qué hace | Pruebas |
|---|---|---|---|
| **KI-<clase>** (Opus ×3) | `js/aspects-<clase>.js`, `js/powers-aspects-<clase>.js`, `js/uniques-<clase>.js` | 12 aspectos de especialización (§4.6; dos «V» en habilidades distintas; `delta`) + 4 de clase (útiles en las 3 barras recomendadas); 2 Únicos de clase (≥ 1 de armadura); 3 Míticos | `test-aspects-<clase>` (efecto observable con `makeHarness`; Δ medido ±30 %; F10 rápido; ids únicos) |
| **KU** (Sonnet) | `js/aspects-common.js`, `js/uniques-common.js` | 6 universales y las 4 reliquias como Únicos | `test-aspects-common`, **`test-aspects-cobertura`** (por especialización y **todas las combinaciones de variantes** de las 6 habilidades de su barra, ≤ 729: emparejamiento, ≥ 3 por ranura, ≥ 9 en total) |

### E2b · Economía (EC, Opus; en paralelo con E2) · ~1 día

- **Archivos:** `js/crafting.js` (puro), `js/economy.js`, `js/game-endgame.js` (Códice por reino, tope de Polvo, bendiciones, cofre, aspectos de jefe, Chispas y Mítico elegido, **glifos únicos por tipo**), `js/main.js` (solo drops), `js/materials.js`, `js/data.js` (solo «Bastión» de `ERA_MUTATORS`, con G(AL); v4.2: el crítico de «Cazador» y «Furia» ya no se toca, §4.12).
- **Qué hace:** mejora con remate; mover ★ con coste creciente; re-tirada con semilla y pool corto; **Afinar** (dado con semilla, nunca baja, 1,3ᵐ); engarce; combinar gemas; grabar (Raro o Legendario); desguace en oro con resumen y deshacer; mercader con recompra; apuesta con tabla de precios y reparto de rarezas por ranura; Polvo con tope. Fuera el cubo, la encantadora, las runas, las palabras rúnicas y los charms.
- **Pruebas:** `test98-crafteo` (costes, factor de ranura, «solo esa línea», Afinar nunca baja y su coste crece, ★ ×1,5, gemas que vuelven, Polvo → rango y tope) y `test99-economia` (sin `Math.random` en `crafting.js` ni `economy.js`; glifos: uno por tipo; **ninguna receta pagada con oro crea un aspecto o un rango que no esté en el Códice, ni sube Común → Mágico → Raro; Grabar exige un aspecto del Códice y una ranura con aspecto, y no lo gasta**).

### E3 · Interfaz (U1 ∥ U2 ∥ U3 → U4) · ~2 días

| Trabajador | Archivos (dueño exclusivo) | Qué hace |
|---|---|---|
| **U1** · Inventario, alijo y equipo | `js/ui-inventory.js`, `js/inventory-view.js` (puro), `css/inventory.css`, `tests/test100-inventario-vista.mjs`, `tests/visual/inventory.html` | Rejilla 10×4, muñeco con ◆ en las ranuras con aspecto, ⚡ y ◆ medio, materiales, alijo con pestañas, celdas con ▲/▲▲/⚒, ARIA `grid`, «Mejor para mí», búsqueda con chips, banner de solo lectura |
| **U2** · Tooltip y comparador | `js/item-tooltip.js`, `tests/test101-tooltip.mjs`, `tests/visual/tooltip.html` | ≤ 9 filas (+⚒), Alt (Δ⚡, Δ del aspecto, afinidad), Shift, veredicto, «?», «Pide: …», «⇣», anillos dobles |
| **U3** · Herrería, Códice, cofre, ritmo y filtro | `js/ui-crafting.js`, `css/crafting.css`, `js/loot-filter.js` (puro), `js/ground-labels.js`, `tests/test102-filtro.mjs`, `tests/test103-herreria-vista.mjs` | 6 acciones de la Herrería (con el dado de Afinar), Códice con «subir rango» y tope, Chispas, cofre, preajustes del filtro con potencial, etiquetas en el suelo |
| **U4** · Integración | `js/ui.js`, `index.html`, `css/style.css`, `js/input.js`, `js/main.js` (etiquetas, autorrecogida, pausa) | Monta los módulos; teclas de §7.4; fuera lo viejo; ✦ en la variante potenciada del libro |

**Terminado cuando:** humo `panels` en verde; capturas del juego junto al mockup a 1366 y 1920; sin solapes (`?hudcheck=1`); valoración diferida ≤ 2 ms por fotograma.

### E4 · Banco de ítems · ~1–1,5 días (B1, Opus)

- **Archivos:** `tests/helpers/bench-core.mjs`, `tests/balance-bench.mjs`, `tests/loot-bench.mjs` (nuevo: botín **y economía** por hora con una política de gasto), `js/item-defs.js` (solo constantes, por la cola de W1), `js/combat-math.js` (solo `ENEMY_P4` y constantes de ítems).
- **Qué hace:** perfiles (con la línea base «hoy» de E0.6 como referencia); `ASPECT_RECO`; bendiciones L ≤ 10; **IT0 primero** (implícitos y topes para el Nv50; `ENEMY_P4` para AL 41–50); después IT1–IT7, IT6b (por especialización) y F10; **mide T** (IT4); ajusta constantes de ítems hasta la banda (incluido el tope del daño crítico, ≈ 32 de partida, §4.4); tabla de precios de la apuesta.
- **Rebase de `PENDING_E4B`** con tabla antes/después, con IT0 cumplida y el efecto del sobrecrítico anotado por especialización. **No calibra clases.**

### E5 · Migración final y cierre · ~0,5 día

- **M1 (Opus):** `js/save-schema.js` con saves reales y sintéticos (Nv 69, 70, 80, 100 y Hardcore). Idempotencia, avisos, ⚡ en banda, `validateItem` y `validateLoadout` sobre todo.
- **C1 (Sonnet):** `sw.js` (`VERSION`++), `MEMORIA.md`, `CLAUDE.md` (archivos nuevos, aspectos, Herrería, reinos, `SAVE_VERSION` 6), cuarentena vacía, exports viejos borrados.
- **Orquestador:** humo `full`, capturas, juicio final, fusión y push a las dos ramas.

### 12.1 Esfuerzo total

| Etapa | Trabajos | Modelo | Calendario |
|---|---|---|---|
| E0 | 5 | 3 Sonnet, 2 Opus | 0,5 día |
| E1 | 3 | Opus | 1,5–2 días |
| E1.5 | 1 | Opus | 0,5 día |
| E2 + E2b | 5 (en paralelo) | 4 Opus, 1 Sonnet | 1–1,5 días |
| E3 | 4 | Opus | 2 días |
| E4 | 1 + rondas | Opus | 1–1,5 días |
| E5 | 2 + orq. | Opus, Sonnet | 0,5 día |
| **Total** | **≈ 21 trabajos** | 15 Opus · 6 Sonnet | **≈ 7–8 días de calendario** |

### 12.2 Matriz de propiedad (archivos compartidos)

| Archivo | E0 | E1 | E1.5 | E2/E2b | E3 | E4 | E5 |
|---|---|---|---|---|---|---|---|
| `js/entities.js` | P2 | **W1** (W2 por la cola) | Integ. | 🔒 cola W1 | 🔒 | 🔒 | — |
| `js/items.js` | P2 | **W1** | — | 🔒 | 🔒 | 🔒 | C1 |
| `js/economy.js` | P2 → P3 | — | — | **EC** | — | — | — |
| `js/main.js` | — | **W3** | Integ. | **EC** | **U4** | — | — |
| `js/ui.js` | P2 | — | — | — | **U4** | — | — |
| `js/save-schema.js` | — | **W3** | — | 🔒 | 🔒 | 🔒 | **M1** |
| `js/combat-math.js` | — | **W1** (sobrecrítico, `ENEMY_P4` vacía) | — | 🔒 | — | **B1** (constantes y `ENEMY_P4`) | — |
| `js/data.js` | — | — | — | **EC** (solo «Bastión» de `ERA_MUTATORS`) | — | — | — |
| `sw.js` | **P4** | — | — | — | — | — | **C1** |

### 12.3 Criterios de aceptación

- O1–O9 con su prueba en verde. `npm test` verde **sin cuarentena**. Humo `full` en verde.
- **IT0 en banda** frente a `tests/fixtures/baseline-hoy-p4.json` (E0.6) antes del rebase de `PENDING_E4B`.
- `grep -rn "Math.random" js/crafting.js js/economy.js js/item-gen.js` vacío.
- `grep -rn "statMult\|LEGENDARY_POWERS\|RUNEWORDS\|makeCharm\|elemPct\|watermark\|cubeCost\|transmute" js/` vacío (salvo `save-legacy-items.js`).
- Capturas del juego frente al mockup aprobadas por el dueño.

### 12.4 Qué NO entra en el Paso 4

- Talismán, sellos, templado, palabras rúnicas rehechas y conjuntos nuevos (tras E4b).
- **Criterio de entrada de una capa nueva (INV-B-3):** solo entra si `loot-bench` muestra un hueco de progresión que esa capa cubra (una meta de §4.13 que ninguna capa del MVP de §4.9 alcanza), y paga su interfaz, textos, guardado, migración, banco y pruebas. Las palabras rúnicas se retiran (P4-D7, aprobada); el experto pedía conservarlas como única capa «D2». **Recomendado: se van**, y hay una razón de estructura: con **un solo ◇ por pieza y el tope duro de 4 líneas** (§4.3), una palabra rúnica necesitaría bases con varios huecos, que es un eje nuevo (§14).
- Resistencias y daño elemental enemigo. Quitar el crítico a la Destreza (E4b).
- Comercio. Red, cooperativo y escalera (solo los cimientos de §8).
- Iconos pintados por base. Calibración de clases (E4b).
- El editor de reglas del filtro, si no cabe en E3.

---

## 13. Refutación y cambios

### 13.0 v4.1 · las 13 objeciones altas que no habían llegado a la mesa

Texto íntegro en `refutaciones/altas-no-vistas.md`; una fila por objeción, con fuente, en `refutaciones/trazabilidad-altas.md`. Las comprobé contra **esta** versión y contra el código de `paso2-impl`.

| Id | Estado | Qué pasó | Dónde |
|---|---|---|---|
| INV-B-1 | **Corregida en la v4.2** (en la v4.1, insuficiente) | La escasez se medía solo por caída; hoy el cubo da ≈ 12× más legendarios con oro. El cubo se va e IT7 mide la tasa efectiva de cada fuente. La v4.1 decía «ninguna subida de rareza pagada solo con oro», pero Grabar sobre un Raro lo es: la v4.2 lo acepta como decisión (b1, modelo del Ocultista de D4; la b2 choca con P4-D26) y deja coherentes IT7, `test99`, §4.11 y O1 | §1 O1, §4.9, §4.11, §4.13, IT7, `test99`, R22, §14 |
| INV-B-2 | **Corregida** (lo de la escalera es del Paso 6) | `origen` pasa a solo informativo; `killLootRng` es por contador; el determinismo de este paso cubre el crafteo y el botín, no la partida, y ninguna regla valida carreras por semilla. La autoridad de la escalera la fija el Paso 6 (D12) | §8, R19 |
| INV-B-3 | **Corregida**, con conflicto (discrepancia aceptada por la verificación) | MVP cerrado de crafteo y criterio de entrada para capas nuevas. **Conflicto:** el experto quería conservar las palabras rúnicas; P4-D7 (aprobada) las retira. v4.2: recomendación escrita en §14 («se van»: incompatibles con el ◇ único y el tope de 4 líneas) | §4.9, §12.4, R18, §14 |
| R1-B-1 | Resuelta (v3) | `mainGear` | §4.4, P4-D5, `test93` |
| R1-B-2 | **Corregida en la v4.2** (en la v4.1, insuficiente) | La v4.1 contaba los talentos en +10 (bien) pero solo sumaba `stats.crit`: faltaban el crítico condicional de 5 especializaciones (6 con el Cruzado de su build por defecto) y los nodos mágicos del tablero (G 7, M 9). Ahora: tabla de 9 especializaciones, **sobrecrítico** (lo que pasa de 60 hace más fuertes los críticos), IT3 en la tirada, Eras de vuelta a +12/+10, IT6 por especialización con afinidad declarada y tope del daño crítico ≈ 32 como palanca de E4 | §0, P4-D21, §4.4, §4.12, §5, §10 (IT3, IT6, IT6b), E1, E2b, §12.2, R20 |
| R1-B-3 | **Corregida en la v4.2** (en la v4.1, insuficiente) | La v4.1 daba bien el arma pero no el héroe. Ahora §10 compara el héroe entero con una réplica del banco de hoy en los Nv50, 58, 70 y 100: **el típico del Nv50 rinde ×0,67–0,73 de DPS y ×0,50–0,54 de Aguante** y el del Nv70, ×1,23–1,31 de DPS (hallazgo alto nuevo). Regla **IT0** de anclaje antes del rebase; el salto del Nv58 al 70 lo absorbe `ENEMY_P4` (AL 41–50), no las clases (P4-D2, R5) | §1 O6, P4-D2, P4-D22, §4.1, §5, §10, R5, R21, E0.6, E4 |
| R1-B-4 | Resuelta (v3) | ⚡ con referencia fija y w por rol; una sola regla | §6, P4-D17 |
| R1-B-5 | Resuelta (v3) | Unidad de presupuesto y paridad IT6/IT6b. v4.2: la lista «fuera de banda» suma la Vida al golpear del Nv50 (1,25) y la del Guerrero del Nv100 (1,21) | §4.4, IT6 |
| R1-B-6 | Resuelta (v3) | Economía por hora | §4.13, IT7 |
| R2-B-1 | Resuelta (v4) | El valor depende solo del ◆ | §4.2, P4-D4 |
| R2-B-2 | Resuelta (v4) | 6 ranuras con aspecto y «V» en habilidades distintas (precisé la frase de la configuración alternativa). v4.2: `test-aspects-cobertura` recorre todas las combinaciones de variantes de la barra (`FORGE_RECO` no fija Rajar ni la Lanza) | §4.6, P4-D25, O3 |
| R2-B-3 | Resuelta (v4) | Oro como única moneda de la Herrería, Afinar, apuesta topada, Tormento ⌊T/4⌋, sin marca de agua | §4.9–§4.13 |
| R2-B-4 | **Corregida en la v4.2** (en la v4, insuficiente) | El potencial no proyectaba Afinar, y Afinar es el sumidero del final del juego: en las horas 20–60 casi nada salía ⚒. Ahora proyecta los pasos a igual inversión (el paso de tu línea del mismo puesto, coste por la esperanza del dado 5 ⁄ (6 − q)) y la fila ⚒ da el coste de afinar | §0, P4-D29, §6, §7.6, W2, `test95` |

### 13.0b v4.2 · verificación de las altas

El experto que escribió las objeciones verificó la v4.1 (`refutaciones/verificacion-altas.md`): 9 pasaban (7 bien y 2 discrepancias aceptadas: INV-B-2 e INV-B-3) y 4 no alcanzaban. La v4.2 corrige las 4 y sus notas menores; el estado final de cada id está en `refutaciones/trazabilidad-altas.md` («Tras la verificación»).

| Id | Qué faltaba | Qué hace la v4.2 | Dónde |
|---|---|---|---|
| INV-B-1 | Grabar sobre un Raro es un legendario pagado con oro: `test99` e IT7 fallaban por construcción | Decisión b1 escrita (sin material escaso; modelo del Ocultista de D4; la b2 choca con P4-D26 y queda en §14); IT7 en bases Raro+, la apuesta además en legendarios, el grabado fuera de la cuota; `test99` vigila aspectos y rangos nuevos; la consecuencia, en O1 y §4.11 | §1, §4.9, §4.11, §4.13, IT7, E2b, R22, §14 |
| R1-B-2 | Faltaba el crítico condicional (5 especializaciones en todas sus builds) y los nodos mágicos del tablero: 4 pasaban de 60 sin Era y 6 con una Era | Tabla de 9 especializaciones; **sobrecrítico** en el contrato de E0.1 (exacto, no «+2 por punto», que retenía 46–58 %); IT3 en la tirada; Eras de vuelta a +12/+10; IT6 por especialización; tope del daño crítico ≈ 32 como palanca | §0, P4-D21, §4.4, §4.12, §5, §10, E1, E2b, §12.2, R20 |
| R1-B-3 | El salto frente a hoy no tenía regla que lo viera | Tabla del héroe entero frente a una réplica del banco de hoy (hallazgo alto nuevo: Nv50 ×0,67–0,73 de DPS y ×0,50–0,54 de Aguante); **IT0** antes del rebase; `ENEMY_P4` absorbe el salto del Nv58 al 70; E0.6 mide la línea base | §1 O6, P4-D2, P4-D22, §4.1, §5, §10, R5, R21, §12, §14 |
| R2-B-4 | El potencial no proyectaba Afinar | Pasos a igual inversión (mismo puesto por valor) y coste por la esperanza del dado; fila ⚒ con el coste; `test95` con el caso 5/5/5★ frente a 3/3/3 | §0, P4-D29, §6, §7.6, E1 W2 |
| Notas menores | Recomendación de las palabras rúnicas; Vida al golpear fuera de banda; variantes no fijadas por `FORGE_RECO` | §14 con la recomendación; §4.4 con la lista completa; O3, regla 7 y KU con todas las combinaciones | §4.4, §4.6, §12.4, §14 |

### 13.1 Refutación externa · ronda 2 (experto en itemización de ARPG y MMO)

**Veredicto recibido:** «Aprobable con cambios, pero todavía no pases a E0.1/E1». Los arreglos de contrato de la ronda 1 están bien (`@insignia`, `gaugeStat`, `areaLevelForHero`, la cubeta) y la arquitectura es sólida; fallan 4 cosas altas que salen de los propios números y varias medias que tocan contratos (`lineValue`, pools, `validateItem`, `score`). Pide una v4 y una ronda corta de verificación.
**Nota de proceso:** el informe me llegó **cortado** en el problema 10. Los problemas 11 y 12 los tomé del resumen del veredicto («los glifos repetidos; y los Míticos sin límite») y los resolví con lo que encontré en el código; si el experto quería otra cosa, entra en la ronda de verificación. **Del segundo experto (multijugador) no llegó nada otra vez:** repetí la pasada propia (§13.2).

| # | Grav. | Problema | Veredicto | Cambio aplicado | Dónde |
|---|---|---|---|---|---|
| R2-1 | Alta | El ◆ no ordena: el rango multiplicaba ×1,065 pero el ilvl movía casi en plano 13 de las 17 líneas (hasta +29 % con el mismo ◆; un ◆47 ganaba a un ◆50) | **Aceptada** | El valor depende **solo del ◆**: G para las planas y **1,035^◆** para las % y el Principal (+19 % de r0 a r5; 20 % del tope en ◆6). Topes de las % ×0,814 para conservar la línea típica. Prueba en `test92` y en el mockup (6,441 = 6,441). Elegí 1,035 y no 1,065 porque las % multiplican al arma, que ya es G | §4.2, §4.4, P4-D4 |
| R2-2 | Alta | La cobertura de aspectos era imposible (dos «V» excluyentes en Berserker y Crionte) y el BiS salía por eliminación | **Aceptada, opción (b) del experto** | **6 ranuras con aspecto** (P4-D25); regla 2: las dos «V» en habilidades distintas (Estocada Partida → **Furia sin Freno**; Lanza Pesada → **Ventisca Viva**); `test-aspects-cobertura` por configuración, ≥ 3 por ranura y ≥ 9 en total (Berserker 12, Crionte 14). Además, al rehacerla encontré **4 aspectos de clase muertos** en las barras recomendadas (Embestida, Parpadeo, Paso Veloz y la Barrera no están en ninguna): pasan a efectos sobre `@movement` o sin requisito (regla 8) | §4.6, O2, O3 |
| R2-3 | Alta | La economía se saturaba (sobraba el 85–90 % en 40–60 h), Esencia y oro iban siempre juntos, la marca de agua no frenaba, el Tormento vaciaba el sumidero, las gemas se completaban en 2 h y la apuesta daba ×7 bases | **Aceptada** | (1) **Solo oro** en la Herrería; la Esencia no existe (P4-D26). (2) **Afinar** 3 500·1,3ᵐ sin tope y **mover ★** 10 000·1,5ᵏ: sumideros que crecen (P4-D28). (3) Apuesta con precio = 2 × oro/h ÷ Raro+ por ranura y hora (≈ 28 000), Raros al paso ≤ 3 sin ★, legendarios solo en ranuras con aspecto; IT7 por ranura. (4) Tormento: rango ⌊T/4⌋ y +2 % de pasos 5 y +0,5 % de ★ al caer por escalón. (5) Gemas 1 cada 2 élites y como mucho Talladas; las Perfectas pasan a la meta completa. (6) **Marca de agua fuera** y cito la regla real de WoW (P4-D27). (7) Precios que escalan + **tope de Polvo 1 000** e IT7 «oro sin gastar ≤ 2 h». Matiz: la apuesta no cobra Esencia porque la Esencia desaparece | §4.9, §4.10, §4.13, IT7 |
| R2-4 | Alta | El veredicto comparaba lo recién caído con tu equipo mejorado; ↔ etiquetaba mejoras claras; T = 1 % menor que el error del modelo | **Aceptada** | **Veredicto a potencial** con ⚒ (P4-D29); regla nueva (▲ si el peor eje ≥ −3 % o g ≥ 2·\|peor eje\|; ▲▲ con g ≥ 10 %); **T = p95 del error de IT4** (2 % de partida). Matiz: comparo con **tu aspecto regrabado**, no con «el mejor del Códice», para que sea a igual inversión (si no, casi todo Raro saldría ⚒) | §6, §7.2, §7.6 |
| R2-5 | Media | Vida (7 de 9 pools) y Principal (6) como impuesto; compensación lineal en `hpPerLevel` | **Aceptada con matiz** | **Vida implícita** en las armaduras y la mano izq. (5,5·G(◆)); **Principal solo en arma y guantes**; P4-D22 cambia: sin compensación (vida típica Nv70 1 610–1 730, hoy ≈ 1 700). **Discrepo** en «Vida al azar solo en la joyería»: con los topes (crítico, enfriamiento, RD, esquiva) las 4 armaduras no tienen 4–5 líneas sin tope duro aparte de Vida y Armadura; dejo Vida al azar en ellas, pero con valor 0,85–0,93 de su pool en ⚡ (ya no es la que todos quieren). WoW evita el problema porque sus secundarias no tienen topes duros [S] | §4.1, §4.4, §10, P4-D22 |
| R2-6 | Media | IT6 no se podía cumplir entre clases (el daño crítico vale según el crítico de cada clase) | **Aceptada** | IT6 **por clase y por eje** en los Nv50, 70 y 100; **afinidad declarada** (crítico / daño crítico) a ±50 % y visible en Alt; tabla del Nv70 en §4.4 | §4.4, IT6 |
| R2-7 | Media | Las líneas ✚ eran trampa (0,5–0,7 de sus vecinas en ⚡) | **Aceptada** | **IT6b** (paridad por pool en ⚡, w = 0,55); «% Coste» se funde en «% Recurso» (tope 28); Principal fuera de los pools con ✚. En el modelo, las ✚ quedan en 0,97–1,01 de su pool. También salió de las líneas la velocidad de movimiento (0,27–0,42: otra trampa), que pasa a implícito de botas (P4-D30) | §4.4, IT6b |
| R2-8 | Media | «% Daño de tu elemento» era el mismo valor que «% Daño» con otro nombre | **Aceptada** | **«% Daño de tus ‹cat›»** con selector `@basic`/`@spender`/`@insignia`, tope 26 % (2,2×); vale según la parte de esa categoría en tu barra | §4.4, §5 |
| R2-9 | Media | El tope +2 de rango dejaba muerta la 3.ª línea y no escalaba | **Aceptada** | Tope **+1 por selector**, sin tope global; solo arma (`@spender`) y amuleto (`@insignia`/`@ultimate`/`@movement`), que nunca coinciden; desde ◆ 36. `test92`: ninguna combinación legal deja una línea en 0 | §4.4, §5 |
| R2-10 | Media (cortado) | Pools ≥ 5 y re-tirada que nunca sube el paso | **Aceptada** | **Afinar** sube el paso; la re-tirada saca las nuevas al paso 2–4 y, si el pool es corto, ofrece la misma línea con otro paso; pools ≥ 4 | §4.1, §4.9 |
| R2-11 | (veredicto) | Glifos repetidos | **Aceptada (inferida)** | `socketGlyph` (`economy.js:514-528`) [V] deja engarzar el mismo tipo varias veces: 4 Precisiones r10 ≈ +36 % de crítico, fuera de IT3. **Uno de cada tipo** (regla propia por IT3: no encontré que D4 la tenga), los repetidos suben rango al tuyo (tope 10) y **Precisión → daño crítico** | §4.8, §4.12, §8 |
| R2-12 | (veredicto) | Míticos sin límite | **Aceptada (inferida)** | **Solo un Mítico activo** (el segundo no da líneas ni poder); 2 Chispas por repetido; lo valida `validateLoadout` | §4.3, §4.7, §8 |

**Contratos que pedía el veredicto antes de E1:** `lineValue(stat, no, paso, peso)` (nueva firma), la tabla de pools v4, `validateItem` (selector, `af`, `sm`, aspecto solo en ranura con aspecto), `validateLoadout` (nuevo) y `score` con `pot`. Quedan en §12 (E0.1).

### 13.2 Pasada propia con sombrero de multijugador en navegador · ronda 2 (sustituye al experto que no llegó)

Contrastada con `../paso6-multijugador/paso6-multijugador-diseno.md` v4 y con los cambios de esta ronda.

| # | Objeción | Veredicto | Cambio |
|---|---|---|---|
| M19 | «Afinar, la re-tirada y la ★ cambian el objeto con contadores que viajan en los regalos: un cliente modificado puede mandar `af` negativo o dos ★» | **Aceptada** | `validateItem` comprueba `rr` ≤ 6, `af` y `sm` enteros ≥ 0 y una sola ★ (§8) |
| M20 | «`validateItem` mira un objeto, pero un compañero puede unirse con 9 Míticos o 4 Precisiones» | **Aceptada** | `validateLoadout` en `recompute` y en el saneado del Paso 6 (§8) |
| M21 | «El precio de la apuesta "medido por hora" depende de cada cliente» | **Aceptada** | Tabla fija por tramo de nivel, la misma para todos y para el servidor de la escalera (§8) |
| M22 | «Con el oro como moneda única, regalar oro sería comercio encubierto» | **Aceptada** | El oro y el Polvo no se regalan (§8) |
| M23 | «El ⚒ del compañero usa tus fichas: si no viajan, la respuesta al regalo es distinta» | **Aceptada** | El compañero responde con su propia ficha (en su cliente); solo viaja «▲/⚒/↔/▼» (§8) |
| M24 | «La sincronización recortaba ilvl y rango por separado» | **Aceptada** | Con el valor función del ◆, `mín(◆, NOz + 2)` es exacto (§4.2) |
| M25 | «El tope de Polvo y las Chispas, ¿son por reino?» | **Aceptada** | Sí, como el Códice (§8) |

### 13.3 Refutación externa · ronda 1 (resumen; detalle en `paso4-items-diseno.v3.bak.md` §13.1)

- **E1–E6 (altas):** Principal adaptable asimétrico → `mainGear`; topes con todas las fuentes y crítico solo en anillos; `GEAR_K = 1,69` sobre la media; una sola regla de veredicto con ⚡ de referencia fija y w por rol; unidad de presupuesto y paridad; economía con horas.
- **E7–E12 (medias):** la mejora sube todo; cobertura de ranuras defensivas con Utilidad; aspectos dentro de presupuesto con Δ declarado; modelo con recurso, sustento, esquiva y movilidad; sincronización completa; almacén por reino.
- **E13–E15 (contrato):** `@insignia`, claves del indicador en `powerStats`, receta de Mítico por Chispas.
- **Pasada propia de multijugador (M11–M18):** `heroId` en la v6 de este paso, `killLootRng`, Web Locks, `uid` por bloques, regalo en dos fases, textos que no viajan, semilla en el servidor de la escalera, mismo margen de sincronización que el Paso 6.

### 13.4 Rondas internas de la v2 (resumen)

- **Itemización (I1–I10):** gemas del pool de su ranura; «de tu elemento» y «+1 a tu ‹cat›»; ≤ 50 % «V»; [×] escaso; el raro como base de grabado; 10 ranuras; el Mítico como techo fijo; re-tirada con coste creciente y semilla.
- **Multijugador (M1–M10):** dos niveles de confianza; `uid` global; anti *save-scum* por semilla; fichas de valoración; pestaña «Importado»; ◆ efectivo; pausa solo en solitario; identificación automática; formato compacto.
- **UX (X1–X3):** «Herrería» frente a «forja»; pocas monedas a la vista; ≤ 9 filas y una marca por línea.

---

## 14. Preguntas al dueño (✅ las 12 respondidas «sí», 22-oct; 3 recomendaciones nuevas de la v4.2 al final)

1. **10 ranuras** al estilo D2 (sin hombreras ni pantalones). ✅ Aprobada por el dueño (22-oct)
2. **6 ranuras con aspecto** (arma, mano izquierda, guantes, amuleto, 2 anillos) y las armaduras de stats con Únicos (P4-D25). ✅ Aprobada por el dueño (22-oct)
3. La Herrería cobra **solo oro** (sin Esencia) (P4-D26). ✅ Aprobada por el dueño (22-oct)
4. **Afinar** con un dado que nunca baja y cada vez cuesta más (P4-D28). ✅ Aprobada por el dueño (22-oct)
5. El **crítico solo en los anillos** (P4-D21). ✅ Aprobada por el dueño (22-oct). La decisión no cambia; las cifras sí: en la v4.2, con el crítico condicional de cada especialización y el tablero bien contado, cuatro especializaciones pasan de 60 sin Era y seis con una Era, y lo que sobra se convierte en sobrecrítico (recomendación B, abajo).
6. `ILVL_MAX` en **47**. ✅ Aprobada por el dueño (22-oct). **Aviso de la v4.2 (no cambia la decisión):** con 47, del Nv58 al 70 el típico gana ×1,75–1,78 de DPS por el equipo, cuando hoy se queda igual (equipo congelado en il40) mientras la vida enemiga crece ×1,84. No se te había explicado ese efecto: lo absorbe la recomendación C, abajo.
7. Se retiran **runas, palabras rúnicas, charms y conjuntos** hasta después de E4b. ✅ Aprobada por el dueño (22-oct). **Conflicto anotado:** INV-B-3 pedía conservar las palabras rúnicas como única capa «D2» del crafteo; queda lo aprobado (pregunta abajo, ahora con recomendación).
8. Rejilla **1×1** (no dos tamaños). ✅ Aprobada por el dueño (22-oct)
9. Las **metas en horas** (2–4 / 12–20 / 40–60 h). ✅ Aprobada por el dueño (22-oct)
10. El **Mítico por 4 Chispas**, solo uno activo. ✅ Aprobada por el dueño (22-oct)
11. **Pausa** al abrir paneles en solitario, por defecto. ✅ Aprobada por el dueño (22-oct)
12. Publicar los **arreglos de E0.3** antes del rework. ✅ Aprobada por el dueño (22-oct)

**Pregunta de la v4.1 (por el conflicto de la 7):** ¿las palabras rúnicas se van en el Paso 4, como aprobaste (y vuelven, si acaso, tras E4b por el criterio de §12.4), o **se quedan en el Paso 4 como la única capa «D2»** del crafteo, como propone INV-B-3? **Recomendado: se van** (incompatibles con el ◇ único y el tope de 4 líneas: una palabra rúnica pediría bases con varios huecos, un eje nuevo). Coincide con lo aprobado, así que no hace falta otra respuesta salvo que quieras cambiarla.

**Recomendaciones nuevas de la v4.2** (mientras no digas otra cosa, vale la recomendada):

- **A. Grabar un aspecto del Códice sobre un Raro** (INV-B-1). (a) **Recomendado: solo oro**, como el Ocultista de D4: no crea poder nuevo (copia uno que ya ganaste) y respeta P4-D26 («la Herrería cobra solo oro»). Efecto: tras ≈ 10–12 h un legendario que cae vale su Polvo y su aspecto o rango si es nuevo; la persecución pasa a la base, los Únicos y los Míticos. (b) Oro + 5 de Polvo al grabar sobre un Raro (sobre un Legendario, solo oro): el naranja sigue contando más tiempo, pero la Herrería cobraría dos monedas (choca con P4-D26).
- **B. Crítico por encima de 60** (R1-B-2). (a) **Recomendado: sobrecrítico**: la probabilidad se queda en 60 y lo que sobra hace más fuertes tus críticos; ninguna línea muere y las especializaciones de crítico ganan un poco (el Rayo del Arcanista ≈ +7–8 %). (b) Rendimientos decrecientes desde 45 (baja el DPS de hoy de la Francotiradora y del Arcanista). (c) Tope duro como hoy (deja muertos los anillos en 4 especializaciones, 6 con una Era).
- **C. Quién absorbe el cambio de poder frente a hoy** (R1-B-3). (a) **Recomendado:** el típico del Nv50 se ancla a hoy con los implícitos de los ítems, y del Nv58 al 100 la vida y el daño de los enemigos de AL 41–50 (`ENEMY_P4`) dejan el TTK y el TTD como hoy: si mejoras el equipo entre el 58 y el 70, juegas como hoy; si no, te quedas atrás. (b) Recalibrar las clases en E4b con un número declarado (toca 9 especializaciones y no arregla que el salto dependa del nivel). (c) Dejar el tramo 58–100 más rápido que hoy, dentro de las bandas del banco (se baja `ENEMY_P4`).

---

## 15. Fuentes

**Búsquedas y lecturas de esta versión (22-oct-2026):**
- Warcraft Wiki, *Item upgrading* [S]: «50% discounts for Flightstones are applied when a character on an account has reached the ilvl in a given slot» (desde Dragonflight S2); en Midnight la mejora usa oro y emblemas. https://warcraft.wiki.gg/wiki/Item_upgrading · https://warcraft.wiki.gg/wiki/Crests
- Blizzard Watch, *Upgrade gear in Midnight* (2-mar-2026) y *Season 1 crest caps removed* (20-may-2026) [S]: 20 emblemas por rango, tope semanal de 100, retirado como recuperación. https://blizzardwatch.com/2026/03/02/upgrade-gear-midnight-no-valorstones-required · https://blizzardwatch.com/2026/05/20/season-1-upgrade-crest-caps-removed-wow-midnight/
- Icy Veins, *Midnight Season 2 raises gear to 337, but upgrades cost more* [S]: emblemas por pista en la T2. https://www.icy-veins.com/wow/news/item-level-of-loot-in-midnight-season-2/
- Gameluster, *Diablo 4 Season 11 PTR overhauls tempering and masterworking* [S]: cada intento de masterwork suma 2–5 de calidad hasta 20; al tope, un remate convierte un afijo al azar en mayor y se puede re-tirar con materiales. https://gameluster.com/diablo-4-season-11-ptr-tempering-masterworking-overhaul/
- Icy Veins, *Why Diablo 4's tempering/masterworking rework is a game changer* [S] (refinamiento con tope del 20 %). https://www.icy-veins.com/d4/news/why-diablo-4s-tempering-masterworking-rework-is-game-changer/
- d4guides.gg, *Season 15: legacy uniques & new mythic items* y PC Games, *Shadowdrop für neue Mythic-Uniques* [S]: un solo Mítico fabricado equipado. https://d4guides.gg/en/guides/diablo-4-season-15-legacy-uniques-new-mythic-items · https://www.pcgames.de/diablo-4-spiel-55956/news/mythic-unique-shadowdrop-saison-14-1548481/
- Fextralife, *Diablo 4 Glyphs*, y guías de glifos de D4 (Prima, Deltia's) [S]: los glifos se engarzan en zócalos y se suben en el Pozo; **ninguna dice si se puede engarzar dos veces el mismo**, así que la regla «uno de cada tipo» de §4.12 es propia [D]. https://diablo4.wiki.fextralife.com/Glyphs · https://primagames.com/tips/how-to-level-up-glyphs-in-diablo-4
- Path of Exile Wiki, *Divine Orb* y Mobalytics, *PoE 2 currency guide* [S]: re-tira los valores de los modificadores sin cambiarlos. https://pathofexile.fandom.com/wiki/Divine_Orb · https://mobalytics.gg/poe-2/guides/currency-guide

**Citadas por la refutación de la ronda 2 (las conservo):**
- Warcraft Wiki, *Item level* («items with equal ilvl are meant to be of roughly equal potential use»). https://warcraft.wiki.gg/wiki/Item_level
- Warcraft Wiki, *Secondary stat* y *Stamina*. https://warcraft.wiki.gg/wiki/Secondary_stat · https://warcraft.wiki.gg/wiki/Stamina
- Blizzard, *Lord of Hatred* («more than 200 aspects reworked»). https://news.blizzard.com/en-us/article/24267729/prepare-for-the-reckoning-lord-of-hatred-draws-near
- Icy Veins, *Crest discounts in TWW S2*; CurseForge, *Gear Info*. https://icy-veins.com/wow/news/crest-discounts-in-tww-s2 · https://www.curseforge.com/wow/addons/gear-info
- FFXIV, *Allagan Tomestones* (450 por semana, 2 000 acumulados). https://ffxiv.consolegameswiki.com/wiki/Allagan_Tomestones
- Maxroll, *Using Kadala efficiently* (D3). https://maxroll.gg/d3/resources/using-kadala-efficiently
- kami-labs, *Objets mythiques — Lord of Hatred* (el Tormento sube la probabilidad de Míticos). https://kami-labs.fr/en/diablo-4/objets-mythiques-diablo-4-lord-of-hatred-en/
- Icy Veins, *Top Gear de Raidbots* y foro oficial de WoW («sim the item at its highest upgrade level»). https://www.icy-veins.com/wow/how-to-use-the-top-gear-feature-of-raidbots · https://us.forums.blizzard.com/en/wow/t/gear-upgrade-add-ons-that-deal-with-the-new-system/1592523
- Icy Veins, prioridades de stats por especialización. https://www.icy-veins.com/wow/demonology-warlock-pve-dps-stat-priority
- Engadget, BlizzCon 2013 (golpe y pericia eliminados). https://www.engadget.com/2013-11-09-blizzcon-2013-huge-changes-coming-to-itemization.html
- Blizzard, *Season 4 Loot Reborn*. https://news.blizzard.com/en-gb/article/24077223/galvanize-your-legend-in-season-4-loot-reborn

**Citadas por las objeciones altas atendidas en la v4.1 (§13.0):**
- Maxroll, *Horadric Cube* de D4 LoH (actualizada el 14-oct-2026): «Upgrade to Legendary: 1 Rare item, 1 Pure Primordial Dust, 10 Raw Primordial Dust» (INV-B-1). https://maxroll.gg/d4/resources/horadric-cube
- Rune, *Making JS deterministic for fun and glory* (25-jul-2024) y WebKit, bug 150403 (`Math.pow` distinto entre Chrome y Safari) (INV-B-2). https://developers.rune.ai/blog/making-js-deterministic-for-fun-and-glory/ · https://bugs.webkit.org/show_bug.cgi?id=150403
- Cloudflare, *Durable Objects free tier* (7-abr-2025) (INV-B-2). https://developers.cloudflare.com/changelog/2025-04-07-durable-objects-free-tier/
- Icy Veins, *Huge Diablo 4 vendor crafting changes in Season 11*, y kami-labs, *PoE2 0.5 Return of the Ancients* (INV-B-3). https://www.icy-veins.com/d4/news/huge-diablo-4-vendor-crafting-changes-in-season-11/ · https://kami-labs.fr/en/path-of-exile-2/poe2-patch-0-5-return-of-the-ancients-notes-complet-en/
- Código (v4.1): `js/talents-<clase>.js` (nodo c13, rango 2 en todas las builds), `js/talents.js:74-80, 411-413`, `js/progression.js:17`, `js/data.js:419-427` (`ERA_MUTATORS`), `js/economy.js:251-254, 336-358`, `js/main.js:1231-1233, 1284-1285, 1545`, `js/entities.js:917-935, 2616-2695, 2982`, `js/game-zone-life.js:47-86, 159`.

**De la v4.2 (verificación de las altas, 22-oct-2026):**
- Warframe Wiki, *Critical Hit* [S]: «Values over 100% have a chance to become Big Critical Hits (orange)»; «The added Damage is doubled for Big Critical Hits» (lo que sobra del crítico sube su daño en vez de perderse; base del sobrecrítico). https://wiki.warframe.com/w/Critical_Hit
- PureDiablo, *Legendary Aspect* (D4) [S]: el Ocultista graba un aspecto en «a Rare item changing it into a Legendary Item» por oro y materiales de artesanía; «All Aspects rewarded or extracted are permanently stored in your Codex of Power». https://www.purediablo.com/diablo4/Legendary_Aspect · Fextralife, *Occultist* [S]. https://diablo4.wiki.fextralife.com/Occultist
- Maxroll, *Horadric Cube* de D4 LoH (la receta Raro → Legendario con Polvo Primordial, citada por el verificador para la opción b2). https://maxroll.gg/d4/resources/horadric-cube
- Código (v4.2): `js/entities.js:798-800, 911-935, 1009-1039` (calidad, crítico, `rollDamage`); `js/combat-math.js:44-46, 85-93, 123-138, 161-169, 540-560`; `js/paragon-board.js:21-63`; `js/mech-arquera.js:20-40, 118`; `js/mech-maga.js:37-42, 186`; `js/talents-guerrero.js:72, 95, 133, 317-463`; `js/talents-maga.js:84, 107, 145, 211, 277, 302, 311, 328-495`; `js/talents-arquera.js:67, 315-478`; `js/powers-guerrero.js:83, 430, 1128-1131, 1641-1643`; `js/powers-maga.js:151, 195, 1510, 2134, 2610`; `js/skill-resolve.js:34-39` (Certero, +25 de crítico a una habilidad); `js/items.js:7-61, 196-272`; `js/skills-guerrero.js:610-614`; `js/skills-maga.js:868-876, 910-914`; `tests/helpers/bench-core.mjs:68-119, 170-220`; `tests/balance-bench.mjs:60-80, 118`.

**De las versiones anteriores (siguen vigentes; enlaces en `paso4-items-diseno.v3.bak.md` §15):** d4guides.gg *Season 15* (tres vías al Mítico), Mobalytics (categorías y Purveyor), Icy Veins (rendimientos decrecientes de WoW 12.x; filtro de D4), DEV Community y WHATWG (Web Locks y `localStorage`), PCGamesN (duplicación de oro de Last Epoch), PureDiablo (masterworking), notas de la beta de WoD, Hazzikostas (13-sep-2026), Warcraft Wiki *Stat budget*, FFXIV *Materia*, Titan Quest II, Realm FAQ de D2 y Last Epoch.

**Mockup v4** (`mockup/index.html`): fórmulas v4 (`lineVal` por ◆, curvas G y 1,035, `K_HP`, pools v4, «% daño de tus ‹cat›», +1 por selector, un Mítico activo), veredicto con ▲▲, ↔ por peor eje y potencial con ⚒, Herrería con Afinar (dado), mover ★ creciente y todo en oro, aspectos solo en 6 ranuras (◆ en el muñeco), Ritmo con la curva de Afinar y la apuesta por ranura, filtro con potencial. **Verificación:** `v4/check-v4.cjs` corre la lógica sin navegador (todos los objetos pasan las reglas de `validateItem`; ⚡, vida, crítico, veredictos ahora y a potencial; «◆47 por dos caminos» igual) y una sola sesión de Chrome sin ventana, por turno, recorrió las 6 vistas × 3 héroes a 1440 y 1366 px sin desbordes ni imágenes rotas, probó mejorar, re-tirar, afinar, engarzar, grabar, desguace con Deshacer, filtro, cofre, alijo y ritmo, y sacó **1 captura** (`preview/captura-v4-mochila.png`). El único error de consola fue del propio guion de captura (buscaba un objeto del Guerrero con la Maga activa, así que la captura muestra la mochila de la Maga); lo corregí en `shot-v4.mjs` sin volver a capturar. Tras la captura agrandé el icono ⚒.

**Modelo propio [D] v4.2:** `calc-r2.mjs` (◆, paridad por clase y por pool, cuotas O6, topes y vida al golpear; en la v4.1, crítico de talentos `TAL_CRIT` = 0 en el Nv20 y 10 desde el Nv50; en la v4.2, tablero G 7 / M 9 / A 12, crítico condicional por especialización `SPEC`, sobrecrítico `critFactor`, paridad por eje (2b) y por especialización (2c), crítico por especialización (5b), IT3 (7) y el perfil «hoy» del banco `heroHoy` para la tabla «frente a hoy» (8); una sola corrida) y `calc-r2-econ.mjs` (mejora, Afinar, ★, apuesta, Polvo, gemas y Chispas; sin cambios). Reproducen `combat-math.js`, `recompute` y `resources.js` de `paso2-impl` 4095ab6 con supuestos declarados (fracciones del DPS: básico 30 %, con enfriamiento 40 %, limitado por recurso 20 %; saco aditivo 60 fuera del equipo; equipo típico = composición media de cada pool).

**Código (solo lectura, `paso2-impl` 4095ab6):** `js/items.js:7-61, 196-272, 440-475`; `js/combat-math.js:43-96, 120-135, 465-562`; `js/resources.js:1-110`; `js/entities.js:750-976, 989-993, 1255-1264`; `js/economy.js:473-585`; `js/paragon-board.js:1-60`; `js/skill-resolve.js:50-110`; `js/skill-defs.js:147-215`; `js/spec-mechanics.js:187-210`; `js/talents.js:440-525`; `js/skills-guerrero.js:27-200, 400-615`; `js/skills-maga.js:32-91, 795-913`; `js/skills-arquera.js:32-44, 793-806`; `js/data.js:81-118`; `js/progression.js:10-25`.
