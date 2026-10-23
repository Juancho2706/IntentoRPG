# Paso 4 · Rework de ítems, inventario y stats — diseño

> **Estado:** diseño **v5** (22-oct-2026). En las rondas anteriores las refutaciones llegaron **recortadas**: del segundo experto de cada ronda casi no llegó nada y del primero faltaba la cola. La v5 atiende **las 220 objeciones de los 6 textos íntegros** (2 refutaciones de la investigación y 4 del diseño: 139 problemas y 81 faltantes). Cada una tiene su estado en `refutaciones/trazabilidad.md` (resuelta en §x, discrepo con razón y fuente, o pendiente; **no queda ninguna pendiente**). Resumen de cambios en §13.0. Faltan las decisiones del dueño (§3 y §14). No toca código.
> **Autor:** diseñador líder del Paso 4. **Insumos:** `investigacion/arpg.md`, `ux.md` y `actual.md` (v2, corregidos en esta ronda donde la refutación encontró datos falsos o viejos); el diseño del cooperativo `../diseno-mp/paso6-multijugador-diseno.md` v4; lectura del código en `paso2-impl` (4095ab6); las búsquedas y lecturas web de octubre de 2026 (§15); y el modelo analítico propio **v4** (`calc-r2.mjs` y `calc-r2-econ.mjs`, marcado [D]), que reproduce las fórmulas del código (salida en `out-r2.txt` y `out-r2-econ.txt`). Los números nuevos de la v5 que no salen del modelo van marcados [M] (los mide el banco).
> **Mockup:** `mockup/index.html` (v5: un glifo por significado, «Potencia», engaste ◉, aspecto ⚜, teclas sin choque con el combate, veredicto con el eje principal del rol, cifras sin cortes y sin reglas para móvil). La v4 queda en `mockup/index.v4.bak.html` y el documento v4 en `paso4-items-diseno.v4.bak.md`.
> **Qué manda.** Este documento fija el **sistema, los contratos y el orden**. Los números son **de partida** y salen del modelo [D]: los cierra el banco en la etapa E4 de este paso (constantes de ítems) y después la calibración E4b (clases).
> **Marcas:** [V] verificado en fuente primaria o en el código · [S] fuente secundaria · [D] deducción o modelo propio · [M] a medir en el banco.

---

## 0. Resumen

1. **Tres ejes visibles por pieza:** ◆ **nivel de objeto** (ilvl + rango de mejora; en el documento, «NdO»), **rareza** (cuántas líneas y si trae aspecto) y **◉ engaste** (una línea que eliges con una gema). **El valor de una línea depende solo del ◆**: dos piezas con el mismo ◆, las mismas líneas y los mismos pasos valen lo mismo, y un ◆ mayor siempre vale más (§4.2).
2. **La rareza solo decide líneas y aspecto.** Desaparece `statMult`. El arma conserva al raro de hoy con `GEAR_K = 1,69` sobre la media.
3. **Seis ranuras llevan aspecto** (arma, mano izquierda, guantes, amuleto y los 2 anillos); las **cuatro armaduras** (casco, pecho, cinturón y botas) son de stats, con **Vida y Armadura implícitas** que crecen con el ◆, y se persiguen por su ◆, sus pasos, la ★, la gema y los Únicos. Con 12–14 aspectos útiles por configuración para 6 ranuras, **elegir aspectos es una decisión de build**, no una eliminación (§4.6).
4. **Aspectos que cambian habilidades del Paso 2,** con el vocabulario `fx` de los talentos: 36 de especialización (4 × 9; las dos «V» de una especialización nunca son variantes de la misma habilidad), 12 de clase y 6 universales. **Ningún aspecto repite un nodo de talento** y, si toca la misma clave, declara cómo se apila (regla F11, §4.6).
5. **Nada queda muerto al cambiar de manos** y **ninguna línea es un impuesto:** la **Potencia** (el atributo principal del equipo) solo está en el arma y los guantes y va a `mainGear` (solo daño); la Vida sale sobre todo del implícito; «% Daño de tu elemento» se cambia por **«% daño de tus ‹categoría›»** (básicos, gastadoras o Insignia), que sí obliga a decidir.
6. **Presupuesto con unidad y paridad medida:** cada línea queda a ±20 % de la mediana de su eje **dentro de su clase** (IT6), de las demás de **su pool medido en ⚡** (IT6b) y **en cada especialización** con su barra recomendada (IT6c). El crítico vive solo en los anillos: **ninguna clase pasa del 43 %** con el equipo óptimo, y los topes se comprueban **por habilidad**, con soportes y talentos (IT3, §4.4).
7. **Una sola valoración** (`js/valuation.js`) y **una sola regla de veredicto**, con tres ejes (**Daño**, **Aguante** y, para el apoyo y el control, **Apoyo**), un escenario fijo (40 % jefe, 60 % manada) y la comparación **a potencial**: lo que cae se compara con tu pieza a **igual inversión**. Si solo gana así, la celda lleva un martillo ⚒ y el tooltip dice cuánto cuesta (§6).
8. **Economía que no se satura:** la Herrería cobra **solo oro**; el Polvo es del Códice y las Chispas, del Mítico. **Afinar** (subir el paso de una línea con un dado; nunca baja) es el sumidero que crece. Sin marca de agua. Metas **en solitario**: build funcional **2–4 h**, completa **12–20 h**, techo **40–60 h**, medidas en T0 y en T8 (§4.13).
9. **Se funden o se van:** la Calidad pasa al ◆, las gemas al engaste ◉ y la Esencia **no llega a existir**. Las reliquias pasan a Únicos, los Míticos se rehacen (**solo uno activo**; el catálogo nuevo llega en la ola E6), los glifos son **uno de cada tipo**, y el Códice y el alijo pasan a la cuenta. Runas, palabras rúnicas, charms, conjuntos, encantadora y cubo **se retiran**.
10. **Preparado para el cooperativo en navegador:** almacén de cuenta **por reino** con persistencia pedida y copia exportable, cerrojo de líder entre pestañas, `validateItem` y **`validateLoadout`** comunes con el saneado del Paso 6, regalos **sin devolución por tiempo** y con prueba de botín, `uid` que nunca se reescribe, `heroId` en la migración v6 y botín por `killLootRng`. Los contratos con el Paso 6 v4 están en una tabla (§8.1). No se implementa red en este paso.
11. **Lo que faltaba (nuevo en la v5):** la **Armería** (equipos guardados por especialización, §7.8), la regla **IT8** (el TTK del Paso 2 no se mueve sin decirlo, §10), un **glifo por significado** (§7.2) y teclas que no chocan con el combate (§7.4).

**El tooltip, en una imagen** (≤ 9 filas; números del mockup v5 para el Berserker Nv72):

```
✦ Hoja del Ocaso                      ⚔  ◆45 ◔        ← glifo y color de rareza · ranura · ◆ con anillo de mejora (3/5)
▲▲ Daño +27,6 %  ▼ Aguante −3,2 %                    ← Δ⚡ +14,2 %: ▲▲ porque g ≥ 10 % y g ≥ 2·|−3,2 %|
⚔ 65–97 · 1,30/s                                      ← implícito (◆45 = ilvl 42 + 3 rangos)
• +6 Potencia                        ▰▰▰▰▰             ← atributo principal, con el icono de tu Fuerza; solo daño (mainGear)
• +39,8 % daño crítico               ▰▰▰▰▰★            ← ★ = afijo mayor (paso 6); en Alt: «≈ +4,1 % de tu daño»
• +9,0 % vel. de ataque              ▰▰▰▱▱
◉ Topacio · +6,5 % daño              ▰▰▰▰▱             ← engaste: la línea que eliges (vacío = ◌)
⚜ Molino: el 3.er giro deja un sangrado del 40 % · r3  ← aspecto; sin la variante: atenuado + «Pide: Molino»
```

Y cuando solo gana tras invertir (Guantes de Ónice, ◆47 recién caídos, frente a tus guantes ◆49 con ★ y Esmeralda):

```
≈ Daño −2,5 %  Aguante −0,9 %
⚒ ▲ tras mejorar · Daño +4,5 % · Aguante +1,5 % · mejorar a ◆52 · mover tu Esmeralda · 15 900 oro
```

---

## 1. Objetivos y cómo se miden

| # | Objetivo | Medida | Dónde se comprueba |
|---|---|---|---|
| O1 | **Botín emocionante y legible** | ≤ 9 filas de tooltip (+1 fila ⚒ si aplica); 3 superposiciones por celda; **un glifo por significado** (prueba de unicidad); ≥ 1 legendario cada ~140 **monstruos comunes** en T0 con un 85 % [M] de aspectos de tu clase; sonido, haz y etiqueta para Legendario+ y para la ★ al caer; ≥ 1 ▲ por hora al héroe óptimo en T8+ | `test101-tooltip`, `loot-bench` |
| O2 | **Sinergia con el Paso 2** | Cada especialización tiene ≥ 4 aspectos que tocan su kit, su forja o su indicador; **sus dos «V» piden variantes de habilidades distintas**; los 4 de clase sirven en las 3 barras recomendadas; **ningún aspecto repite un nodo** (F11) | `test-aspects-<clase>`, reglas F10 y F11 |
| O3 | **Decisión de aspectos** | En **cada configuración de variantes** (como mínimo la barra recomendada y la alternativa), cada una de las 6 ranuras con aspecto tiene **≥ 3 candidatos útiles** y hay **más candidatos que ranuras** (≥ 9 para 6) | `test-aspects-cobertura` |
| O4 | **Endgame de crafteo** | Mejora con remate ★, re-tirada dirigida, **Afinar**, grabado, Míticos con techo fijo | `test98-crafteo` |
| O5 | **Sin sopa de stats** | 16 líneas; 0 líneas muertas (ninguna combinación legal deja una línea en 0, y ninguna línea aporta < 50 % de su valor en las habilidades que hacen la mitad del DPS); paridad por clase (IT6), por pool en ⚡ (IT6b) y por especialización (IT6c) | `test92`, IT3, IT6, IT6b, IT6c |
| O6 | **Cuota de poder del equipo fijada** | Líneas sobre blancos con implícito — DPS: 20–30 % (típico Nv20), 30–40 % (Nv50), 40–50 % (Nv70), 50–60 % (óptimo Nv100); Aguante: 30–40 %, 40–50 %, 45–55 %, ≤ 65 %. Vida típica del Nv50 y del Nv70 = hoy ±10 % | regla IT1 |
| O7 | **Una sola verdad de «mejor»** | Veredicto (ahora y a potencial), ▲, orden, ⚡ y banco salen de `valuation.js` con **una sola regla**; ningún hover cambia `hp`/`mp`; el ⚡ crece con el nivel; el apoyo y el control tienen su eje | `test95-valoracion` |
| O8 | **Guardados que sobreviven** | v5 → v6 sin perder objetos de valor; los aspectos van al Códice; idempotente; `heroId` y `accountId` creados; la cuenta pide almacenamiento persistente y tiene copia exportable | `test97-guardado-v6` con saves reales, `test96-cuenta` |
| O9 | **Ritmo conocido y sin saturación** | Metas en horas en solitario (2–4 / 12–20 / 40–60 h), en T0 y en T8; la apuesta da ≤ ½ de las bases por ranura y hora que matar; el oro sin gastar nunca pasa de 2 h de ingresos con la política de gasto del banco | regla IT7 de `loot-bench` |
| O10 | **El combate del Paso 2 no se mueve sin decirlo** (nuevo) | TTK de normales, élites y jefe y TTD de manada del perfil típico a ±10 % (TTD ±15 %) de la línea base de `paso2-impl` en los Nv20, 50, 70 y 100, en T0 y T10 | regla IT8 de `balance-bench` |

---

## 2. Principios (reglas de fondo)

1. **Tres ejes visibles por pieza** (◆, rareza, ◉). El resto (★, rango del aspecto, gema, paso) es una **marca dentro** de un eje.
2. **El ◆ es el potencial.** El valor de una línea es función del ◆ (y de su paso y su peso), no de cómo se llegó a ese ◆. Así «◆ más alto» siempre significa «mejor a igualdad de líneas» (el contrato del ilvl de WoW [S]).
3. **Regla de inversión.** Lo barato se pierde (la mejora cuesta ~1/6 de hora de oro por pieza); lo caro (Afinar, ★) se hace en piezas finales, como el masterworking de D4; lo que no se pierde vive en la cuenta (Códice) o se recupera (gemas, aspecto regrabado).
4. **Nada muerto al cambiar de manos.** Toda línea se resuelve para quien la lleva y **solo** hace lo que dice.
5. **Una sola valoración** y **una sola regla de veredicto**, que compara a igual inversión.
6. **El ítem habla el idioma de los talentos.** Los aspectos son `fx` con rango; lo nuevo va por `definePower`, nunca por un `if` en combate (`CLAUDE.md`). **El talento elige un comportamiento; el aspecto lo potencia o le da rango, nunca lo repite** (F11; Lord of Hatred *trasladó* pasivas del árbol a los aspectos, no las duplicó [S]).
7. **Cada número tiene una hora:** fuentes y sumideros por hora, medidos por `loot-bench`.
8. **Cada moneda tiene un dueño y cada sumidero crece:** oro = Herrería y apuesta; Polvo = Códice; Chispas = Mítico. Ningún recurso se queda sin uso marginal antes de la hora 60.
9. **Un glifo, un significado** (nuevo): ninguna forma se usa para dos cosas en la celda, el tooltip, el Códice o el libro de habilidades (tabla canónica en §7.2, con prueba de unicidad).
10. **El combate calibrado del Paso 2 manda** (nuevo): si una regla de cuota (IT1) choca con la de TTK (IT8), gana IT8 y lo que se mueve es la curva enemiga, documentado (§10).

---

## 3. Decisiones grandes (opciones y recomendada)

| ID | Pregunta | Opciones | Recomendada | Por qué |
|---|---|---|---|---|
| **P4-D1** | ¿Cuántas ranuras? | (a) 12, como hoy · (b) **10 al estilo D2** (sin hombreras ni pantalones) · (c) 10 al estilo D4 | **(b)** | Coincide con los iconos `eq_*` y deja menos piezas, más importantes |
| **P4-D2** | ¿`ILVL_MAX`? | (a) 50 o 57 · (b) 40 + capas (hoy) · (c) **47 = AL del Nv70** | **(c)** | Del Nv70 al 100 el progreso es horizontal (Afinar, ★, Míticos, tablero) |
| **P4-D3** | ¿Qué hace la rareza? | (a) **Líneas + aspecto, sin multiplicador** · (b) multiplicador · (c) las dos (hoy) | **(a)** | Con (c) el legendario domina (≈ ×1,6) |
| **P4-D4** | ¿Cómo valen el ilvl y el rango? | (a) **El valor depende solo del ◆; cada rango es +1 ◆** (% y Principal ×1,035; planos ×1,065) · (a′) rango ×1,065 a todo e ilvl aparte (v3) · (b) eje aparte | **(a)** | En la v3 dos piezas con el mismo ◆ diferían hasta un 29 % y un ◆47 podía ganar a un ◆50 (refutación R2-1). Las % no usan G porque multiplican al arma, que ya escala con G: sería doble escala |
| **P4-D5** | ¿Atributos? | (a) **«Potencia» adaptable en `mainGear`, solo en arma y guantes** · (b) botín inteligente · (c) 4 atributos | **(a)** | Sin efectos secundarios (v3) y sin impuesto: fuera de las armaduras (R2-5). Se llama **Potencia** (con el icono de tu atributo) y no «Fuerza/Destreza/Energía» ni «Principal»: la Destreza del equipo no da crítico y «Principal» ya es la categoría de las gastadoras (`CAT_LABELS`) |
| **P4-D6** | ¿Gemas? | (a) **La gema es la línea ◉** (solo encaja si su línea está en el pool o es la Perla; se quita gratis) · (b) engastes dentro del techo · (c) como hoy | **(a)** | Funde dos ejes; Rubí solo donde hay Vida al azar; Amatista solo en arma y guantes; **Perla** (curación y escudos) para el apoyo |
| **P4-D7** | ¿Runas, palabras rúnicas, charms y conjuntos? | (a) **Retirarlos** · (b) mantener · (c) Talismán ya | **(a)** | Cada uno es un eje más y ninguno escala |
| **P4-D8** | ¿Cómo se cambia una línea? | (a) **Re-tirar UNA línea elegida** (2 opciones o la tuya) · (b) templado · (c) encantadora al azar | **(a)** | Modelo de D4 y Titan Quest II; el paso se sube aparte con Afinar (P4-D28) |
| **P4-D9** | ¿Monedas? | (a) **Oro (Herrería y apuesta) + Polvo (Códice) + Chispas (Mítico)** · (a′) Esencia + Polvo + oro (v3) · (b) materiales por rareza | **(a)** | En la v3 Esencia y oro se pagaban siempre juntos: dos contadores para una sola decisión (R2-3) |
| **P4-D10** | ¿Rejilla? | (a) **1×1 de 10×4** · (b) dos tamaños · (c) D2/PoE | **(a)** | Sin Tetris en un cooperativo que no se pausa |
| **P4-D11** | ¿Identificar? | (a) **Automático, revelación animada en Legendario+** · (b) clic gratis · (c) pergaminos | **(a)** | Un clic sin decisión |
| **P4-D12** | ¿Hallazgo mágico? | (a) **Fuera de las líneas** · (b) línea · (c) quitarlo | **(a)** | No compite con el combate ni infla el ⚡. Precedente: D3 Loot 2.0 quitó el hallazgo mágico al azar de los objetos nuevos [S] (en D4 nunca fue un afijo de equipo, sino de sigilo) |
| **P4-D13** | ¿De quién es el Códice? | (a) **De la cuenta, por reino** · (b) de cada héroe | **(a)** | Lo caro vive en la cuenta; cada reino tiene el suyo |
| **P4-D14** | ¿Protección contra la mala suerte? | (a) **Polvo → aspecto elegido r1 y +1 rango (salvo los mayores [×], que solo entran al caer); cofre «elige 1 de 3»; jefes de piso con su aspecto y su Único favorito** · (b) contador oculto · (c) nada | **(a)** | Un aspecto concreto en ≤ 5 legendarios; los mayores mantienen la persecución por botín |
| **P4-D15** | ¿Bendiciones? | (a) **Tope en nivel 10; Ojo Certero → daño crítico** · (b) tope por grieta · (c) igual | **(a)** | Hoy una bendición de grieta 27 vale más que las líneas |
| **P4-D16** | ¿Nivel requerido? | (a) **Blando: ◆ efectivo = mín(◆, ◆ máx. de tu nivel)** · (b) bloqueo · (c) nada | **(a)** | El rango ya no se suma por fuera del tope, así que un alt del alijo no lleva +7 de ventaja; sirve también para la sincronización |
| **P4-D17** | ¿⚡ Poder? | (a) **(D/D₁)^wD·(A/A₁)^wA·(S/S₁)^wS, referencia fija (desnudo Nv1) y pesos por rol** · (b) dos números | **(a)** | Crece con nivel, talentos y equipo; ▲ y ⚡ salen de la misma cuenta; el apoyo y el control tienen su eje (S) |
| **P4-D18** | ¿Comercio? | (a) **Sin comercio; regalo solo dentro del grupo** · (b) libre · (c) nada | **(a)** | Con guardado local nada es de fiar |
| **P4-D19** | ¿Mítico? | (a) **Línea libre fuera de combate + 4 Chispas → el que elijas; solo uno activo; 2 por especialización (UNI y ÁREA) en la ola E6** · (b) solo de botín · (c) 1 por especialización en E2 (v4) | **(a)** | D4 limita a un Mítico fabricado equipado [S]; con 1 por especialización todos los Piromantes llevarían el mismo (queja a «Mythic 3.0», T14–T15 [S]) |
| **P4-D20** | ¿Pausa al abrir paneles? | (a) **En solitario sí; en cooperativo no** · (b) nunca · (c) siempre | **(a)** | |
| **P4-D21** | ¿Dónde vive el crítico? | (a) **Solo en los anillos (línea al azar)** · (a′) implícito de los anillos · (b) guantes y anillos con menos valor · (c) rendimientos decrecientes | **(a)** | Óptimo del Nv100: 24,8 / 26,8 / 42,9 %. Discrepo de (a′): en el pool del anillo el crítico vale 1,00–1,12 de la mediana (IT6b), así que no es un impuesto, y como implícito todos lo llevarían igual: se perdería la decisión en vez de ganarla. (a′) es el plan B si el banco real lo pone por encima de 1,2; (c), el plan B de E4b |
| **P4-D22** | ¿De dónde sale la vida? | (a) **Vida implícita en las armaduras, con G(◆)** · (a′) compensación lineal en `hpPerLevel` (v3) · (b) todo a E4b | **(a)** | La lineal sobraba en el Nv20 y faltaba en el Nv100 (R2-5); con (a) la vida típica del Nv70 queda en 1 610–1 730 (hoy ≈ 1 700) sin tocar la clase |
| **P4-D23** | ¿Almacén de cuenta? | (a) **Uno por reino** · (b) uno compartido con marca | **(a)** | Lo local no entra en la escalera por la puerta de atrás |
| **P4-D24** | ¿Categorías de aspecto? | (a) **5 (Ofensivo, Defensivo, Utilidad, Movilidad, Mecánica) repartidas en las 6 ranuras con aspecto; el amuleto, todas** · (b) 4 | **(a)** | Tabla en §4.6 |
| **P4-D25** | ¿Cuántas ranuras llevan aspecto? (nuevo) | (a) **6: arma, mano izq., guantes, amuleto y 2 anillos; armaduras de stats + Únicos** · (b) 10, con ≥ 6 aspectos de especialización y 6 de clase (≈ 78) | **(a)** | Con 10 ranuras y ~13 candidatos el BiS salía por eliminación (R2-2); con 6 hay ~13 para 6 y el contenido no crece (R7) |
| **P4-D26** | ¿Cuántas monedas paga la Herrería? (nuevo) | (a) **Solo oro** · (b) solo Esencia (y oro para el resto) | **(a)** | Un contador menos; el oro ya se recoge solo y tiene usos que compiten (Afinar, apuesta) |
| **P4-D27** | ¿Marca de agua? (nuevo) | (a) **Fuera** · (b) descuento real con tope semanal | **(a)** | Sin topes semanales el descuento no frena nada (en WoW se apoya en emblemas topados) [S] |
| **P4-D28** | ¿Cómo se sube el paso de una línea? (nuevo) | (a) **Afinar: dado 1–5, te quedas con el mayor; 3 500·1,3ᵐ** · (b) +1 paso fijo por precio · (c) nada | **(a)** | Sumidero que crece sin tope y no castiga (nunca baja). Divine Orb de PoE [S] |
| **P4-D29** | ¿Contra qué se compara lo que cae? (nuevo) | (a) **Ahora y a potencial (igual inversión), con ⚒** · (b) solo ahora (v3) | **(a)** | En el final del juego casi nada salía ▲ y el filtro tiraba las mejores bases (R2-4) |
| **P4-D30** | ¿Velocidad de movimiento? | (a) **Implícita de las botas (+10 %), fuera de las líneas** · (b) línea al azar (v3) | **(a)** | Como línea valía 0,3–0,4 de su pool en ⚡: era una trampa |
| **P4-D31** | ¿Armería? (nuevo, v5) | (a) **Sí: 5 equipos guardados por héroe, ligados a los presets de talentos y a la barra; cambio gratis fuera de combate** · (b) no | **(a)** | Con 3 especializaciones y aspectos atados a cada una, cambiar de especialización obligaba a recambiar hasta 10 piezas a mano. D4 lo resolvió con la Armería de la T7 [S] |
| **P4-D32** | ¿Cómo entra el apoyo en los ítems? (nuevo, v5) | (a) **Eje Apoyo en el ⚡ + gema Perla (`healPct`) + Únicos de apoyo** · (b) línea al azar solo para quien cura · (c) nada | **(a)** | Una línea al azar de curación queda muerta en el alijo para 7 de 9 especializaciones; la gema la eliges tú, así que nunca está muerta |
| **P4-D33** | ¿Quién sincroniza? (nuevo, v5) | (a) **El Paso 4 da `syncProfile` de ítems (puro); la sincronización completa y opcional (talentos, rango, tablero) es del Paso 6** · (b) meta de 1,15× en el Paso 4 | **(a)** | El Paso 6 §2.5 decidió «solo baja, nunca sube»; con solo los ítems, la meta de 1,15× era imposible |
| **P4-D34** | ¿Cuántos Únicos? (nuevo, v5) | (a) **E2: 1 por especialización + 4 reliquias (13); meta 2 por especialización (22) en la ola E6** · (b) 10 (v4) | **(a)** | Con 10, se coleccionaban en pocas horas y había especializaciones sin Único |
| **P4-D35** | ¿Qué hace la velocidad de ataque? (nuevo, v5) | (a) **Acelera el básico y la preparación y la canalización de todas las habilidades** (`aspdPct` + `skillSpeedPct`) · (b) solo el básico, renombrada «vel. del básico» | **(a)** | Como en D4; con (b) la línea estaba medio muerta en las especializaciones de gastadora o de carga |
| **P4-D36** | ¿Teclas con un panel abierto? (nuevo, v5) | (a) **X = basura y V = favorito con el cursor sobre un objeto; Shift compara solo sobre un objeto de un panel** · (b) Espacio y F (v4) | **(a)** | Espacio, Shift y F ya son acción principal, esquiva y recoger (`bindings.js`); en el cooperativo sin pausa chocaban |

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
- **El arma manda por su implícito:** `GEAR_K = 1,69` sobre la media conserva al raro de hoy (`items.js:210-213`, `entities.js:914-916`) [V]; la armadura usa 1,25.
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

**Paridad (IT6, por clase y por eje).** Con el modelo [D] (`calc-r2.mjs`: equipo típico = composición media de cada pool al paso 3 y gema grado 3; saco aditivo 60 fuera del equipo), una línea al paso 3, ◆ de su nivel y peso 1 aporta en su eje, **respecto de la mediana de las líneas de ese eje en esa clase**:

| Nv70 | Principal | % Daño | ‹cat› | % Crítico | % Daño crítico | % Vel. at. | % Enfr. | % Recurso | Vida | Armadura | % RD | Esquiva | Vida al golpear |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Guerrero | 1,08 | 1,00 | 0,97 | 1,14 | **0,73 a** | 1,00 | 0,97 | 1,00 | 0,93 | 1,02 | 1,00 | 0,91 | 1,18 |
| Maga | 1,05 | 1,00 | 0,97 | 1,11 | **0,73 a** | 1,00 | 0,97 | 0,97 | 0,89 | 1,09 | 1,00 | 0,91 | 1,11 |
| Arquera | 1,05 | 0,95 | 0,92 | 1,00 | 1,14 | 1,00 | 0,97 | 0,97 | 0,89 | 1,09 | 1,00 | 0,91 | 1,11 |
| Δ absoluto (G/M/A) | +4,0/3,9/3,9 % D | +3,7/3,7/3,5 | +3,6/3,6/3,4 | +4,2/4,1/3,7 | +2,7/2,7/4,2 | +3,7 | +3,6 | +3,7/3,6/3,6 | +4,1/3,9/3,9 % A | +4,5/4,8/4,8 | +4,4 | +4,0 | +5,2/4,9/4,9 |

- **a = afinidad declarada.** El daño crítico vale en proporción a tu probabilidad de crítico, que es distinta por clase **a propósito** (Arquera 43 % frente a 25–27 % con el óptimo). Ninguna base global lo arregla (R2-6). Regla: **IT6 exige ±20 % dentro de la clase, salvo las afinidades declaradas, que van a ±50 % y se ven** (en Alt, «tu clase prefiere: % crítico» o «% daño crítico»), como las prioridades de stats por especialización de WoW [S]. Con el óptimo del Nv100 la Arquera llega a 1,5 en daño crítico (sigue dentro).
- **Fuera de banda en el modelo:** en el Nv50, Armadura (1,3–1,5) y Esquiva (0,7) en las 3 clases. Las corrige E4 (`GEAR_K_ARM`, tope de Armadura y de Esquiva) con el banco real.
- **Entre clases** no se exige paridad: el veredicto ya muestra la afinidad.

**Paridad por pool medida en ⚡ (IT6b, nuevo).** Toda línea que comparte pool queda a ±20 % en g (w = 0,55, la mediana de los roles) para cada clase en el Nv70. En el modelo: todas dentro (0,85–1,18), salvo el daño crítico en los pools ⚔ del Guerrero y la Maga (0,71–0,74, la afinidad de arriba). La Vida queda en 0,85–0,93 de su pool: **ya no es la línea que todos quieren**. Las ✚ de la v3 (0,5–0,7 de sus vecinas) suben a 0,97–1,01 al fundir Coste en Recurso y subir su tope (R2-7). La velocidad de movimiento (0,27–0,42) sale de las líneas.

**Techo de una pieza** (en «líneas al paso 5 y ◆52»; % y Principal):

| Estado de la pieza | Valor | % del techo |
|---|---|---|
| Raro recién caído (3 líneas, paso 3, ◆47) | 3 × 0,72 = 2,15 | 48 % |
| + ◇ grado 3 | 2,86 | 64 % |
| + mejora a ◆52 | 3,40 | 76 % |
| + Afinar a paso 5 y gema Perfecta | 4,00 | 89 % |
| + remate ★ | 4,50 | 100 % |

**Topes por clase (crítico con todas las fuentes).** Base 5 + Destreza **del nivel** × 0,15 + talentos (≈ 5) + tablero (Nv81+: Guerrero 4, Maga 6, Arquera 12) + anillos (5,5 × 1,5 × 1,125 = 9,3). Óptimo del Nv100:

| | Sin equipo | Anillos | **Total v4** | v3 | Objetivo |
|---|---|---|---|---|---|
| Guerrero | 15,5 | 9,3 | **24,8** | 32,4 | ≤ 55 |
| Maga | 17,5 | 9,3 | **26,8** | 34,4 | ≤ 55 |
| Arquera | 33,6 | 9,3 | **42,9** | 50,5 | ≤ 55 |

Con la Era del Cazador (+12 %) la Arquera queda en 54,9: ya no topa. El Glifo de Precisión pasa a daño crítico (§4.12): con 4 Precisiones r10 el tablero daba ≈ +36 % de crítico. El resto, con todo al ★ y ◆52:

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
  7. **Cobertura con decisión (O3):** para cada especialización y **cada configuración de variantes** (la barra recomendada y la alternativa, sin mezclar variantes excluyentes), los aspectos **útiles** (activos con esa barra; «del Vendaval» solo si hay una habilidad de un proyectil) admiten una asignación sin duplicados a las 6 ranuras, cada ranura tiene ≥ 3 candidatos y el total es ≥ 9. `test-aspects-cobertura` lo comprueba con un emparejamiento bipartito por configuración.
  8. **Los aspectos de clase sirven a las 3 especializaciones** con su barra recomendada (salvo los «V»). En la v3 tres de ellos pedían habilidades que ninguna barra recomendada lleva (Embestida, Parpadeo, Paso Veloz) y uno, la Barrera; los cambié por efectos sobre «tu habilidad de Movilidad» (`@movement`) o sin requisito.
- **Códice de cuenta (por reino):** guarda el **mejor rango**. Desguazar un legendario lo guarda y da Polvo. **Grabar** pone un aspecto del Códice, a tu mejor rango, en un **Raro** (pasa a Legendario) **o en un Legendario** (reemplaza su aspecto), siempre en una ranura con aspecto. Los que faltan se ven en silueta con su coste en Polvo.

**Cobertura en los dos casos que fallaban en la v3** (candidatos útiles por ranura, barra recomendada):

| Especialización (configuración) | Útiles | Arma | Mano izq. | Guantes | Amuleto | Anillos |
|---|---|---|---|---|---|---|
| Berserker (Rajar ii · Furia i) | Molino, Torbellino Rojo, Sed Insaciable · Tajo Desgarrador, Piel Viva, Coraza de Furia, Zancada Firme · Furia, Volátil, Festín, Viento, Reloj = **12** | 6 | 7 | 7 | 12 | 9 |
| Crionte (Lanza ii · Tormenta i) | Abanico Helado, Ventisca Viva, Prisión Afilada, Invierno Eterno · Dardo Gemelo, Piel de Ceniza, Maná Templado, Paso Arcano · Furia, Volátil, del Vendaval (el Dardo Arcano es de un proyectil), Festín, Viento, Reloj = **14** | 8 | 7 | 9 | 14 | 11 |

12–14 candidatos para 6 ranuras: el BiS sale de una **decisión** (más daño, más aguante o más ritmo), no por eliminación. En la configuración alternativa (Berserker con Frenesí; Crionte con Lanza Pesada) entra un «V» y sale otro: quedan 13 y siguen ≥ 3 por ranura.

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
| Hombreras y pantalones (si P4-D1 = b) | **Se van** | Desguace con **doble** reembolso; aspectos al Códice; aviso |

### 4.9 Crafteo: la Herrería

**Una NPC (la Herrera) con 6 acciones. Todo se paga con oro** (P4-D26). El Polvo es del Códice.

| Acción | Qué hace | Coste de partida | Regla |
|---|---|---|---|
| **Mejorar** | Rango r → r+1 (+1 ◆) | oro 400·(r+1)·(1 + ◆/20) × **factor de ranura** (r0 → r5 en ◆47–52: 20 900 × factor) | En el rango 5, **remate ★** en una línea al azar |
| **Mover la ★** | La ★ a otra línea al azar | oro 10 000·1,5ᵏ (k = movimientos en esa pieza) | **Sin tope**: sumidero terminal |
| **Re-tirar una línea** | Eliges la línea; ves **2 opciones** del pool (al paso 2–4) o te quedas con la tuya | oro 3 000·1,5ⁿ (n = re-tiradas en la pieza, tope n = 6) | Desde la primera, **solo esa línea**. Nunca la ◇ ni la ★. Pool corto: la 2.ª opción es tu misma línea con otro paso |
| **Afinar** (nuevo) | Tiras un dado 1–5 para una línea: **te quedas con el mayor** (el paso nunca baja) | oro 3 500·1,3ᵐ × factor (m = tiradas de afinar en esa pieza) | **Sin tope**. De media 5 tiradas por línea hasta el paso 5. No toca la ★ |
| **Engarzar** | Pone o quita una gema | Gratis | «≈ 0 ⊘» si el tope de la pieza se come el valor |
| **Grabar aspecto** | Aspecto del Códice → Raro (pasa a Legendario) o Legendario (reemplaza el suyo) | oro 1 500·rango | Solo en las 6 ranuras con aspecto; no sobre Únicos ni Míticos |
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
- **Reparto de partida** (T0, piso 21): Mágico 62 · Raro 31 · **Legendario 6** · Único 1. **1 legendario cada ~140 comunes** (hoy ~860), siempre en una ranura con aspecto.
- **Sesgo de aspecto:** 85 % de tu clase y, de esos, la mitad de tu especialización activa; los de habilidades que ya conoces pesan ×2. **Rango al caer** (T0): r1 40 % · r2 30 % · r3 18 % · r4 9 % · r5 3 %; cada escalón de Tormento mueve un 3 % de r1 a r4–r5.
- **Pasos al caer:** 1–5 al 20 % cada uno en T0; Tormento según §4.2.
- **Élite:** 1 objeto seguro (+30 %) y, cada 2 élites, 1 gema. **Jefe de piso:** Raro+ seguro (40 % Legendario). **Jefe de grieta:** el cofre más su `rollDrops`.

### 4.12 Fuentes de stats que compiten con el equipo (topes)

| Fuente | Cambio | Por qué |
|---|---|---|
| Bendiciones | **Nivel máximo 10**; Ojo Certero (`b_crit`) → **daño crítico** | `b_dmg` ≤ 28 % (antes 62 % en grieta 27) |
| Era | «Bastión» escala con G(AL); «Cazador» y «Furia» (+10–12 % de crítico) se aceptan: con el óptimo la Arquera queda en 54,9 | Hoy da +80 de vida sin escalar |
| **Glifos** (nuevo) | **Uno de cada tipo por tablero** [D]; los repetidos suben 1 rango al tuyo (tope 10); **Glifo de Precisión → daño crítico** | `socketGlyph` (`economy.js:514-528`) [V] no impide engarzar 4 Precisiones r10 (≈ +36 % de crítico) |
| Tablero | Sin cambios; su crítico (G 4 · M 6 · A 12) está en la tabla de §4.4 | |
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
- **Lo que no puede pasar** (IT7): que la apuesta dé más de la mitad de las bases Raro+ por ranura y hora, o de los legendarios por ranura y hora, que matar; que el oro sin gastar pase de **2 h de ingresos** entre las horas 2 y 60 con la política de gasto del banco (afinar cuando su Δ⚡ por oro supere al de apostar); que el Polvo tope antes de la hora 20; que las gemas Perfectas lleguen antes de las 7 h; que un aspecto concreto pase de 5 legendarios.
- **Comparación:** WoW Midnight frenaba la mejora con 20 emblemas por rango y un tope semanal de 100 [S], retirado en mayo de 2026 como recuperación [S]; FFXIV topa sus tomos (450 por semana, 2 000 acumulados) [S]. Aquí no hay topes semanales (se juega solo o con amigos y el guardado es local): **el ritmo lo ponen los precios que crecen**.

---

## 5. Stats del héroe: lista final y cómo entran en `combat-math`

```
daño = arma(◆) × coef(habilidad, rango) × (1 + Σ[+]) × (1 + 0,01·(Principal de nivel + mainGear)) × crítico × vulnerable × Π[×] (≤ 3)
Σ[+] = % Daño + % Daño de tus ‹cat› (en esa categoría) + addPct de talentos, forja, soportes y aspectos + daño crítico (solo en críticos)
```

| Stat | Clave | Saco o capa | Tope | Fuentes |
|---|---|---|---|---|
| Daño de arma | implícito | base | — | arma (◆) |
| Principal | `a[mainStat]` + `mainGear` | ×(1 + 0,01·p) | — | nivel y tablero (con efectos secundarios) · arma y guantes (solo daño) |
| % Daño | `dmgPct` | [+] | — | equipo, talentos, bendición (≤ 28) |
| % Daño de tus ‹cat› | `catDmg` → `mods['@cat'].dmg` | [+] en esa categoría | — | equipo |
| % Crítico | `crit` | probabilidad | 60 | anillos (≤ 9,3), Des **del nivel**, talentos, tablero |
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
- **`combat-math.js`:** `ILVL_MAX = 47`; `itemNO(it)`, `effectiveNO(it, nivel)`, `syncProfile(NOz)`, **`lineValue(stat, no, paso, peso)`** (firma nueva: solo el ◆), `noScale(stat, no)` (G o 1,035^◆), `STEP_F = [0.70, 0.775, 0.85, 0.925, 1.0, 1.5]`, `GEAR_K = 1.69`, `GEAR_K_ARM = 1.25`, `K_HP = 5.5`; `tormentMods().quality` pasa a ser el rango ⌊T/4⌋ y se añaden `stepShift` y `starChance`.
- **`entities.js` `recompute`:** líneas por `lineStats(item, p)` con `main → mainGear`, `catDmg` → `mods`, `skillLv` por selector con tope 1; implícitos de vida y armadura; `spdPct` de botas; `critRaw`, `arm`, `maxMP` con atributos sin equipo; `aggregateAspects`; **solo el primer Mítico cuenta**; fuera calidad, gemas viejas, runas, conjuntos y charms; `st.power` desde `valuation.js` y sin buffs (bug 3.14).
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
  - **tu gema** se mueve si encaja y rinde más que la suya;
  - **tu aspecto** se regraba desde el Códice si el candidato es Raro o Legendario de una ranura con aspecto y el suyo vale menos.
  
  No se proyecta Afinar (es azar) ni un aspecto que no tienes. Si el veredicto «ahora» no es ▲ y el «a potencial» sí, **la celda lleva ⚒** y el tooltip añade una fila: «⚒ ▲ tras mejorar · Daño +4,5 % · Aguante +1,5 % · mejorar a ◆52 · mover tu Esmeralda · 15 900 oro». Comparo con **tu aspecto regrabado** y no con «el mejor aspecto del Códice»: si no, casi cualquier Raro saldría ⚒ por un aspecto que también puedes grabar en tu pieza actual.
- **Contrato** `score(p, item)` → `{ dmg, agu, g, verdict, pot: { dmg, agu, g, verdict, rank, gem, aspect, cost, steps }, unknown }`. La celda, el tooltip, «Mejor para mí» (ordena por el mayor de `g` y `pot.g`), el filtro y el ⚡ usan la misma regla. `test95` afirma: ▲ y ▲▲ ⇒ Δ⚡ ≥ T; ↔ ⇒ Δ⚡ ≥ T y peor eje < −3 %; ▼ ⇒ Δ⚡ ≤ −T; `pot.g ≥ g`; el potencial nunca usa un aspecto que no está en tu Códice; los casos de la tabla.
- **«◆ medio»** del equipo junto al ⚡ en el muñeco (Hazzikostas, sep-2026: «visceral attachment to a certain item level number» [S]).
- **Anillos:** simula los dos reemplazos y enseña el mejor; con Shift, los dos.
- **«▲ para algún héroe»:** cada héroe deja una **ficha de valoración** en la cuenta de su reino; el alijo valora contra las 3 fichas de forma diferida, con caché `(uid, revisión del equipo, revisión de la build)`. Las fichas llevan su pieza por ranura (rango, gema, aspecto) para el potencial.
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
- **Filtro en dos niveles:** preajustes (Todo · **Útil para mí** · Solo ▲ · Raro+ · Legendario+) y reglas (≤ 25) con código `IRPGF1`. **«Útil para mí» y «Solo ▲» usan el veredicto a potencial** (▲ o ⚒ para algún héroe tuyo): ya no esconden las mejores bases del final del juego.
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
| Botín | **Personal e instanciado,** con `killLootRng(semillaDelMundo, heroId, netId)` (`paso6` §2.3) | D4 [S], WoW [V] |
| Regalo | Solo dentro del grupo y del botín de esa partida; ventana de 2 h; lo regalado **no se vende** ni se vuelve a regalar. El compañero responde «▲ / ⚒ / ↔ / ▼» (veredicto a potencial). **Transferencia en dos fases** con «en tránsito», `validateItem`, acuse y vuelta a los 30 s; el receptor descarta un `uid` repetido. **El oro y el Polvo no se regalan** | WoW, D3, Last Epoch (duplicación de oro, 2025) [S] |
| Comercio | Ninguno (P4-D18) | — |
| Identidad | `accountId` y `heroId` en la migración v6; **`uid` global**; `origen: { reino, partida }` | Hoy el `uid` es un contador local |
| Varias pestañas | Escrituras de la cuenta dentro de `navigator.locks.request('irpg-cuenta:<reino>')` con `rev` y relectura; `BroadcastChannel('irpg')`; la 2.ª pestaña, **solo lectura**; `uid` reservado en bloques de 64 | Web Locks: Chrome 69, Firefox 96, Safari 15.4 [S] |
| **Validación de objeto** | `validateItem(compacto)` puro: base existe, ◆ ≤ 52, líneas del pool de la ranura sin repetir, selector válido para la ranura, pasos 1–6 (una ★ salvo Mítico), gema que encaja, aspecto del catálogo **solo en ranura con aspecto** y con categoría válida, rango 1–5, Único/Mítico del catálogo, **contadores `rr` ≤ 6, `af` y `sm` enteros ≥ 0**, números finitos | `paso6` §5.4 |
| **Validación de equipo** (nuevo) | `validateLoadout(héroe)`: **un Mítico activo**, **un glifo por tipo**, «+1» con tope por selector, aspectos duplicados inactivos, ranuras y clases correctas. La usan `recompute` (para no confiar en el guardado) y el saneado del Paso 6 cuando un compañero se une con su héroe | Un cliente modificado podría mandar 9 Míticos o 4 Precisiones |
| Nombres | Los textos **nunca viajan**: `nameOf(seed, base)` y catálogo | `paso6` §5.4 (XSS) |
| Determinismo | Semilla por objeto (re-tirada, Afinar, ★) y por cuenta (apuesta); en la escalera, las guarda el servidor. **El precio de la apuesta es una tabla fija por tramo de nivel**, no una medida en vivo de cada cliente, para que todos y el servidor de la escalera den el mismo número | Bug 3.15 |
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
4. **Ranuras retiradas** (si P4-D1 = b): desguace con doble reembolso, aspecto al Códice y aviso.
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
| **IT1** | Cuota del equipo en banda (O6), en DPS y en vida efectiva, y vida típica del Nv70 = hoy ±10 % |
| **IT2** | Del Nv58 al 70 el equipo crece ×1,45–1,65 |
| **IT3** | Ninguna línea topada con el óptimo y todas sus fuentes: crítico ≤ 55 %, el resto ≤ 60 % de `CAPS`; una línea de vida al golpear no llena la cubeta en UNI |
| **IT4** | El veredicto del modelo coincide en signo con la simulación en ≥ 95 % de 200 pares por clase **fuera de la zona ±T**, incluidos pares que solo difieren en recurso, vida al golpear, esquiva o ‹cat›. **Mide T** = percentil 95 de \|g_modelo − g_sim\| |
| **IT5** | Óptimo frente a típico en [1,3; 15] |
| **IT6** | Paridad **por clase y por eje**: cada línea a ±20 % de la mediana de su eje en su clase en los Nv50, 70 y 100; las afinidades declaradas (crítico / daño crítico), a ±50 % y visibles en Alt; las gemas de una misma ranura, ±20 % |
| **IT6b** (nuevo) | Paridad **por pool en ⚡**: toda línea de un pool a ±20 % en g (w = 0,55) de la mediana del pool, para cada clase en el Nv70, salvo afinidad declarada |
| **IT7** | Ritmo (`loot-bench`): metas de §4.13 ±30 %; apuesta ≤ 0,5 × matar en Raro+ y en legendarios **por ranura y hora**; oro sin gastar ≤ 2 h de ingresos entre las horas 2 y 60; Polvo sin topar antes de la hora 20; gemas Perfectas no antes de 7 h; un aspecto concreto ≤ 5 legendarios |
| **F10** | Paridad de variantes con aspectos y Δ declarado de cada aspecto dentro de ±30 % de lo medido |

**Impacto esperado del arma** (modelo [D], `calc-r1.mjs`; el arma ya escalaba solo con el ◆):

| Arma (media) | Hoy | v4 (`GEAR_K` 1,69) | Δ |
|---|---|---|---|
| Típico Nv50 (il 36, raro) | 45,9 | 45,9 | ±0 % |
| Óptimo Nv50 (rango 5) | 73,7 | 62,9 | −15 % |
| Típico Nv70 y Nv100 (hoy il 40; v4 il 47) | 59,0 | 91,9 | +56 % (efecto de `ILVL_MAX`) |
| Óptimo Nv70 y Nv100 | 94,8 | 125,8 | +33 % |

**Cuotas y vida** (modelo [D] v4, `calc-r2.mjs`; líneas = 1 − valor(blancos con implícito)/valor(perfil); equipo entero = frente al héroe sin nada):

| Perfil | DPS (líneas) | Aguante (líneas) | Aguante (equipo entero) | Vida |
|---|---|---|---|---|
| Típico Nv20 | 21–24 % | 32–34 % | 56–60 % | 512–538 |
| Típico Nv50 | 34–38 % | 42–45 % | 69–74 % | 994–1 071 |
| Típico Nv70 | 44–49 % | 49–52 % | 78–82 % | **1 610–1 727** (hoy ≈ 1 700) |
| Óptimo Nv100 | 52–58 % | 59–63 % | 83–87 % | 2 334–2 511 |

- **Sin `HP_P4_COMP`:** la vida implícita mantiene la del Nv70 y crece con G como el daño enemigo (G^0,85), así que no hace falta tocar `hpPerLevel` (P4-D22).
- **Óptimo del Nv100:** pierde ≈ 14 % de DPS por el tope de bendiciones y gana +33 % de arma.
- **Nota de método:** el modelo v3 usaba 1,69 para la armadura implícita; el v4 usa 1,25, como dice §4.1.

**Reparto del trabajo:** E4 de este paso solo ajusta **constantes de ítems** (`GEAR_K`, `GEAR_K_ARM`, `K_HP`, topes de las líneas, pesos, ritmo, tabla de precios de la apuesta, costes de Afinar) hasta que IT1–IT7 queden en banda. **`PENDING_E4B`** (95 entradas) se **rebasa** al cierre. **E4b** calibra clases y especializaciones.

---

## 11. Riesgos y mitigación

| # | Riesgo | Prob. · Impacto | Mitigación |
|---|---|---|---|
| R1 | **Alcance** (items, economy, entities, ui, main y el banco a la vez) | Alta · Alto | Etapas con dueños exclusivos (§12), stubs antes de E1, cuarentena vacía al cierre |
| R2 | **La migración pierde algo valioso** | Media · Alto | Saves reales, respaldo, aspecto siempre al Códice, doble reembolso, `validateItem`/`validateLoadout`, idempotencia |
| R3 | **Los aspectos rompen la paridad de variantes** | Media · Medio | Δ declarado, F10, ≤ 2 «V» en habilidades distintas |
| R4 | **CPU del modelo único** (ahora con el potencial: 2 evaluaciones por candidato) | Media · Medio | `deriveStats` sin DOM, caché, `requestIdleCallback`, ≤ 2 ms por fotograma; medir en E3 |
| R5 | **Quitar `statMult`, topar bendiciones y mover la vida al implícito** mueven todo el banco | Alta · Medio | Esperado: E4 ajusta constantes (`K_HP` incluido); E4b calibra clases |
| R6 | **10 ranuras** o **6 con aspecto** no le gustan al dueño | Media · Bajo | P4-D1 y P4-D25; el dato admite más |
| R7 | **Volumen de contenido** (54 aspectos + 10 Únicos + 9 Míticos) | Media · Medio | Igual que la v3 (P4-D25 evita los ≈ 78 de la otra opción) |
| R8 | **Arte** (iconos por base, Polvo, Chispas, dado) | Alta · Bajo | Tanda de Codex con refutación de arte; hasta entonces, `eq_*` con tinte |
| R9 | **Alt y clic derecho en el navegador** | Media · Bajo | `preventDefault`, Chrome y Firefox, remapeo |
| R10 | **Inflación de oro** (sin comercio) | Media · Bajo | Sumideros que crecen (Afinar, ★) e IT7 «oro sin gastar ≤ 2 h» |
| R11 | **Dos sistemas** (forja de habilidades y Herrería) | Media · Medio | Nombres distintos y ✦ en la variante potenciada |
| R12 | `ui.js` compartido y enorme | Alta · Medio | Módulos propios; `ui.js` solo los monta |
| R13 | **El modelo [D] se equivoca** (paridad, cuotas, horas) | Media · Medio | Son de partida: IT1, IT3, IT6, IT6b e IT7 con el banco real deciden |
| R14 | **Dos pestañas** escriben la cuenta a la vez | Baja · Alto | Web Locks + `rev` + solo lectura |
| R15 | **Afinar se siente como tragaperras** (nuevo) | Media · Medio | Nunca baja, precio a la vista, dado con resultado fijado por semilla, curva en la pantalla Ritmo |
| R16 | **El ⚒ confunde** (nuevo) | Baja · Bajo | Solo aparece cuando cambia la respuesta; la fila dice qué hacer y cuánto cuesta |
| R17 | **Las armaduras se sienten planas sin aspecto** (nuevo) | Media · Medio | Vida y Armadura implícitas que crecen con el ◆, ≥ 1 Único por armadura, ★ y Afinar; P4-D25 queda como pregunta al dueño |

---

## 12. Plan por etapas

### 12.0 Mapa de dependencias

```
E0 Preparación ──► E1 Motores (W1 ∥ W2 ∥ W3) ──► E1.5 Integración ──┬─► E2 Contenido (KI ×3 ∥ KU) ──┬─► E4 Banco (B1) ──► E5 Migración final y cierre
  P1 ∥ P2 ∥ P3 ∥ P4                                                 ├─► E2b Economía (EC) ───────────┤
                                                                    └─► E3 Interfaz (U1 ∥ U2 ∥ U3 → U4) ┘
```

- **Antes de E0.1:** ronda corta de verificación de esta v4 (pedida por el veredicto de la ronda 2).
- **Rama:** `paso4-items`, desde `claude/isometric-rpg-game-xmer7p` cuando el Paso 2 esté publicado. Cada trabajador en su worktree; el orquestador fusiona.
- **Modelos** (regla del dueño): Sonnet para lo mecánico, Opus para implementar, el modelo principal solo para orquestar y juzgar. Tras cada ola, juicio del diff; lo deficiente vuelve **al mismo** trabajador; reintentos en un workflow **nuevo** solo con los fallidos.
- **Pruebas pesadas por turno** (`tools/turno.mjs`); un workflow a la vez.
- **Coordinación con el Paso 6:** `heroId`, `killLootRng`, `validateItem`/`validateLoadout`/`sanitizeItem` y la clave del reino se acuerdan en E0.1 (§3.4 y §5.4 de `paso6`).

### E0 · Preparación (bloquea todo) · ~0,5 día

| Tarea | Quién | Archivos (dueño exclusivo) | Entrega |
|---|---|---|---|
| E0.1 Contratos | Orq. | este documento → `docs/paso4-items.md`, `tests/run.mjs` (cuarentena), `tests/pending-p4.json` | Contratos fijados (abajo); rama creada |
| E0.2 Saves v5 reales | P1 · Sonnet | `tools/make-v5-saves.mjs`, `tests/fixtures/saves-v5-items.json`, `tests/fixtures/catalog-items-v2.json` | Saves deterministas con todo lo que se migra (Hardcore, Arquera con Destreza en el equipo, legendarios en armaduras, glifos repetidos, dos Míticos) |
| E0.3 Arreglos que no dependen del diseño | P2 · Opus | `js/items.js`, `js/economy.js`, `js/game-endgame.js`, `js/powers-common.js`, `js/ui.js` (solo `_previewEquip` y el flotante ⚡), `tests/test90-items-arreglos.mjs` | Bugs 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8 y 3.14. **Se pueden publicar antes** |
| E0.4 Azar con semilla en economía y bendiciones | P3 · Opus | `js/economy.js` (después de P2), `js/game-endgame.js`, `js/rng.js`, `tests/test91-economia-semilla.mjs` | Bug 3.15 |
| E0.5 Stubs y registro | P4 · Sonnet | `sw.js` (`ASSETS` con todas las rutas nuevas) y archivos vacíos con cabecera y exports: `js/item-defs.js`, `js/item-gen.js`, `js/item-format.js` (`validateItem`, `validateLoadout`, `nameOf`), `js/valuation.js`, `js/account-store.js`, `js/aspects.js`, `js/aspects-<clase>.js` ×3, `js/aspects-common.js`, `js/powers-aspects-<clase>.js` ×3, `js/crafting.js`, `js/loot-filter.js`, `js/ground-labels.js`, `js/game-items.js`, `js/ui-inventory.js`, `js/ui-crafting.js`, `js/item-tooltip.js`, `js/inventory-view.js`, `css/inventory.css`, `css/crafting.css` | `test71` sigue en verde |

**Contratos fijos antes de E1:** formato compacto (§9.1); `validateItem` (con selector, `af`, `sm`, aspecto solo en ranura con aspecto) y `validateLoadout`; **`lineValue(stat, no, paso, peso)`** (solo el ◆), `itemNO`, `effectiveNO`, `syncProfile`, `deriveStats(p, { equip })`, **`score(p, item)` → `{ dmg, agu, g, verdict, pot, unknown }`**; esquema del almacén de cuenta con reino, `rev` y cerrojo; `defineAspect` con `steps` y `delta`; `itemAgg.gaugeStats`; **la tabla de pools y topes de §4.1 y §4.4** (con las 6 ranuras con aspecto).

### E1 · Motores (W1 ∥ W2 ∥ W3) · ~1,5–2 días

| Trabajador | Archivos (dueño exclusivo) | Qué hace | Pruebas nuevas |
|---|---|---|---|
| **W1 · Ítems** (Opus) | `js/item-defs.js`, `js/item-gen.js`, `js/item-format.js`, `js/items.js` (fachada), `js/combat-math.js`, `js/resources.js`, `js/entities.js` (equipo de `recompute`, constructor, `resourceMax`) | Bases y 10 ranuras (6 con aspecto), implícitos de arma, armadura, **vida** y botas, pools v4, `lineValue` por ◆, pasos y ★, rarezas, gemas como ◇, Únicos y Míticos como datos (solo uno activo), `generateItem`/`rollDrops`, ◆ efectivo y `syncProfile`, Tormento (⌊T/4⌋, pasos y ★ al caer), `ILVL_MAX = 47`, `mainGear`, `catDmg`, `resRatePct`, `skillLv` por selector, formato ⇄ vivo, `validateItem`, `validateLoadout`, `nameOf`, `uid` global | `test92-items-gen` (pools, grupos exclusivos, **mismo ◆ ⇒ mismo valor**, ninguna combinación legal deja una línea en 0, topes de IT3), `test93-items-recompute` (simetría de `mainGear`, un Mítico activo, `catDmg` y `skillLv` por selector), `test94-item-format`, `test-sync` |
| **W2 · Valoración** (Opus) | `js/valuation.js`, `js/entities.js` (solo `st.power`, por la cola W1), `tests/helpers/bench-core.mjs` (solo `itemValue` → `valuation`) | `deriveStats`, Daño con rotación y parte por categoría, Aguante, ⚡ con D₁/A₁ y w por rol, **veredicto con ▲▲ y regla del peor eje**, **potencial** (rango, ★ media, gema movida, aspecto regrabado, coste), anillos, fichas, caché | `test95-valoracion` (pureza; reglas de §6; `pot.g ≥ g`; el potencial no inventa aspectos; `mf` no cuenta; el ⚡ crece con el nivel) |
| **W3 · Cuenta y guardado** (Opus) | `js/account-store.js`, `js/save-schema.js`, `js/save-legacy-items.js`, `js/main.js` (carga, guardado e importación) | Almacén por reino con `rev`, Web Locks, `BroadcastChannel` y solo lectura; `uid` por bloques; `SAVE_VERSION = 6`, `accountId`/`heroId`, `MIGRATIONS[5]` (§9.2) | `test96-cuenta`, `test97-guardado-v6` |

### E1.5 · Integración · ~0,5 día

- Fusión de W1, W2 y W3. `js/aspects.js`: `defineAspect`, `aggregateAspects`, rangos, umbrales, `ASPECT_RECO`.
- Mixin **`js/game-items.js`**: `g.salvage`, `g.upgradeItem`, `g.moveStar`, `g.rerollLine`, **`g.refineLine`** (Afinar), `g.socketGem`, `g.imprintAspect`, `g.gamble`, `g.openBossChest`, `g.buyAspect`, `g.rankUpAspect`, `g.craftMythic`, `g.giftOffer`/`g.giftAccept` (esqueletos); registrados en `Object.assign` y `test43-mixins`.
- **Terminado cuando:** `npm test` verde con la cuarentena listada y el humo `boot` arranca héroes Nv1, 20 y 70 de las 3 clases con equipo nuevo.

### E2 · Contenido (KI-guerrero ∥ KI-maga ∥ KI-arquera ∥ KU) · ~1–1,5 días

| Trabajador | Archivos | Qué hace | Pruebas |
|---|---|---|---|
| **KI-<clase>** (Opus ×3) | `js/aspects-<clase>.js`, `js/powers-aspects-<clase>.js`, `js/uniques-<clase>.js` | 12 aspectos de especialización (§4.6; dos «V» en habilidades distintas; `delta`) + 4 de clase (útiles en las 3 barras recomendadas); 2 Únicos de clase (≥ 1 de armadura); 3 Míticos | `test-aspects-<clase>` (efecto observable con `makeHarness`; Δ medido ±30 %; F10 rápido; ids únicos) |
| **KU** (Sonnet) | `js/aspects-common.js`, `js/uniques-common.js` | 6 universales y las 4 reliquias como Únicos | `test-aspects-common`, **`test-aspects-cobertura`** (por especialización y configuración de variantes: emparejamiento, ≥ 3 por ranura, ≥ 9 en total) |

### E2b · Economía (EC, Opus; en paralelo con E2) · ~1 día

- **Archivos:** `js/crafting.js` (puro), `js/economy.js`, `js/game-endgame.js` (Códice por reino, tope de Polvo, bendiciones, cofre, aspectos de jefe, Chispas y Mítico elegido, **glifos únicos por tipo**), `js/main.js` (solo drops), `js/materials.js`.
- **Qué hace:** mejora con remate; mover ★ con coste creciente; re-tirada con semilla y pool corto; **Afinar** (dado con semilla, nunca baja, 1,3ᵐ); engarce; combinar gemas; grabar (Raro o Legendario); desguace en oro con resumen y deshacer; mercader con recompra; apuesta con tabla de precios y reparto de rarezas por ranura; Polvo con tope. Fuera el cubo, la encantadora, las runas, las palabras rúnicas y los charms.
- **Pruebas:** `test98-crafteo` (costes, factor de ranura, «solo esa línea», Afinar nunca baja y su coste crece, ★ ×1,5, gemas que vuelven, Polvo → rango y tope) y `test99-economia` (sin `Math.random` en `crafting.js` ni `economy.js`; glifos: uno por tipo).

### E3 · Interfaz (U1 ∥ U2 ∥ U3 → U4) · ~2 días

| Trabajador | Archivos (dueño exclusivo) | Qué hace |
|---|---|---|
| **U1** · Inventario, alijo y equipo | `js/ui-inventory.js`, `js/inventory-view.js` (puro), `css/inventory.css`, `tests/test100-inventario-vista.mjs`, `tests/visual/inventory.html` | Rejilla 10×4, muñeco con ◆ en las ranuras con aspecto, ⚡ y ◆ medio, materiales, alijo con pestañas, celdas con ▲/▲▲/⚒, ARIA `grid`, «Mejor para mí», búsqueda con chips, banner de solo lectura |
| **U2** · Tooltip y comparador | `js/item-tooltip.js`, `tests/test101-tooltip.mjs`, `tests/visual/tooltip.html` | ≤ 9 filas (+⚒), Alt (Δ⚡, Δ del aspecto, afinidad), Shift, veredicto, «?», «Pide: …», «⇣», anillos dobles |
| **U3** · Herrería, Códice, cofre, ritmo y filtro | `js/ui-crafting.js`, `css/crafting.css`, `js/loot-filter.js` (puro), `js/ground-labels.js`, `tests/test102-filtro.mjs`, `tests/test103-herreria-vista.mjs` | 6 acciones de la Herrería (con el dado de Afinar), Códice con «subir rango» y tope, Chispas, cofre, preajustes del filtro con potencial, etiquetas en el suelo |
| **U4** · Integración | `js/ui.js`, `index.html`, `css/style.css`, `js/input.js`, `js/main.js` (etiquetas, autorrecogida, pausa) | Monta los módulos; teclas de §7.4; fuera lo viejo; ✦ en la variante potenciada del libro |

**Terminado cuando:** humo `panels` en verde; capturas del juego junto al mockup a 1366 y 1920; sin solapes (`?hudcheck=1`); valoración diferida ≤ 2 ms por fotograma.

### E4 · Banco de ítems · ~1–1,5 días (B1, Opus)

- **Archivos:** `tests/helpers/bench-core.mjs`, `tests/balance-bench.mjs`, `tests/loot-bench.mjs` (nuevo: botín **y economía** por hora con una política de gasto), `js/item-defs.js` (solo constantes, por la cola de W1).
- **Qué hace:** perfiles; `ASPECT_RECO`; bendiciones L ≤ 10; reglas IT1–IT7, IT6b y F10; **mide T** (IT4); ajusta constantes de ítems hasta la banda; tabla de precios de la apuesta.
- **Rebase de `PENDING_E4B`** con tabla antes/después. **No calibra clases.**

### E5 · Migración final y cierre · ~0,5 día

- **M1 (Opus):** `js/save-schema.js` con saves reales y sintéticos (Nv 69, 70, 80, 100 y Hardcore). Idempotencia, avisos, ⚡ en banda, `validateItem` y `validateLoadout` sobre todo.
- **C1 (Sonnet):** `sw.js` (`VERSION`++), `MEMORIA.md`, `CLAUDE.md` (archivos nuevos, aspectos, Herrería, reinos, `SAVE_VERSION` 6), cuarentena vacía, exports viejos borrados.
- **Orquestador:** humo `full`, capturas, juicio final, fusión y push a las dos ramas.

### 12.1 Esfuerzo total

| Etapa | Trabajos | Modelo | Calendario |
|---|---|---|---|
| E0 | 4 | 2 Sonnet, 2 Opus | 0,5 día |
| E1 | 3 | Opus | 1,5–2 días |
| E1.5 | 1 | Opus | 0,5 día |
| E2 + E2b | 5 (en paralelo) | 4 Opus, 1 Sonnet | 1–1,5 días |
| E3 | 4 | Opus | 2 días |
| E4 | 1 + rondas | Opus | 1–1,5 días |
| E5 | 2 + orq. | Opus, Sonnet | 0,5 día |
| **Total** | **≈ 20 trabajos** | 15 Opus · 5 Sonnet | **≈ 7–8 días de calendario** |

### 12.2 Matriz de propiedad (archivos compartidos)

| Archivo | E0 | E1 | E1.5 | E2/E2b | E3 | E4 | E5 |
|---|---|---|---|---|---|---|---|
| `js/entities.js` | P2 | **W1** (W2 por la cola) | Integ. | 🔒 cola W1 | 🔒 | 🔒 | — |
| `js/items.js` | P2 | **W1** | — | 🔒 | 🔒 | 🔒 | C1 |
| `js/economy.js` | P2 → P3 | — | — | **EC** | — | — | — |
| `js/main.js` | — | **W3** | Integ. | **EC** | **U4** | — | — |
| `js/ui.js` | P2 | — | — | — | **U4** | — | — |
| `js/save-schema.js` | — | **W3** | — | 🔒 | 🔒 | 🔒 | **M1** |
| `js/combat-math.js` | — | **W1** | — | 🔒 | — | **B1** | — |
| `sw.js` | **P4** | — | — | — | — | — | **C1** |

### 12.3 Criterios de aceptación

- O1–O9 con su prueba en verde. `npm test` verde **sin cuarentena**. Humo `full` en verde.
- `grep -rn "Math.random" js/crafting.js js/economy.js js/item-gen.js` vacío.
- `grep -rn "statMult\|LEGENDARY_POWERS\|RUNEWORDS\|makeCharm\|elemPct\|watermark" js/` vacío (salvo `save-legacy-items.js`).
- Capturas del juego frente al mockup aprobadas por el dueño.

### 12.4 Qué NO entra en el Paso 4

- Talismán, sellos, palabras rúnicas rehechas y conjuntos nuevos (tras E4b).
- Resistencias y daño elemental enemigo. Quitar el crítico a la Destreza (E4b).
- Comercio. Red, cooperativo y escalera (solo los cimientos de §8).
- Iconos pintados por base. Calibración de clases (E4b).
- El editor de reglas del filtro, si no cabe en E3.

---

## 13. Refutación y cambios

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

Contrastada con `../diseno-mp/paso6-multijugador-diseno.md` v4 y con los cambios de esta ronda.

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

## 14. Preguntas para el dueño (cortas)

1. ¿**10 ranuras** al estilo D2 (sin hombreras ni pantalones) o 12?
2. ¿**6 ranuras con aspecto** (arma, mano izquierda, guantes, amuleto, 2 anillos) y las armaduras de stats con Únicos (P4-D25)?
3. ¿La Herrería cobra **solo oro** (sin Esencia) (P4-D26)?
4. ¿**Afinar** con un dado que nunca baja y cada vez cuesta más (P4-D28)?
5. ¿El **crítico solo en los anillos** (P4-D21)?
6. ¿`ILVL_MAX` en **47**?
7. ¿Se retiran **runas, palabras rúnicas, charms y conjuntos** hasta después de E4b?
8. ¿Rejilla **1×1** o dos tamaños?
9. ¿Las **metas en horas** (2–4 / 12–20 / 40–60 h)?
10. ¿El **Mítico por 4 Chispas**, solo uno activo?
11. ¿**Pausa** al abrir paneles en solitario, por defecto?
12. ¿Publicamos ya los **arreglos de E0.3** antes del rework?

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

**De las versiones anteriores (siguen vigentes; enlaces en `paso4-items-diseno.v3.bak.md` §15):** d4guides.gg *Season 15* (tres vías al Mítico), Mobalytics (categorías y Purveyor), Icy Veins (rendimientos decrecientes de WoW 12.x; filtro de D4), DEV Community y WHATWG (Web Locks y `localStorage`), PCGamesN (duplicación de oro de Last Epoch), PureDiablo (masterworking), notas de la beta de WoD, Hazzikostas (13-sep-2026), Warcraft Wiki *Stat budget*, FFXIV *Materia*, Titan Quest II, Realm FAQ de D2 y Last Epoch.

**Mockup v4** (`mockup/index.html`): fórmulas v4 (`lineVal` por ◆, curvas G y 1,035, `K_HP`, pools v4, «% daño de tus ‹cat›», +1 por selector, un Mítico activo), veredicto con ▲▲, ↔ por peor eje y potencial con ⚒, Herrería con Afinar (dado), mover ★ creciente y todo en oro, aspectos solo en 6 ranuras (◆ en el muñeco), Ritmo con la curva de Afinar y la apuesta por ranura, filtro con potencial. **Verificación:** `v4/check-v4.cjs` corre la lógica sin navegador (todos los objetos pasan las reglas de `validateItem`; ⚡, vida, crítico, veredictos ahora y a potencial; «◆47 por dos caminos» igual) y una sola sesión de Chrome sin ventana, por turno, recorrió las 6 vistas × 3 héroes a 1440 y 1366 px sin desbordes ni imágenes rotas, probó mejorar, re-tirar, afinar, engarzar, grabar, desguace con Deshacer, filtro, cofre, alijo y ritmo, y sacó **1 captura** (`preview/captura-v4-mochila.png`). El único error de consola fue del propio guion de captura (buscaba un objeto del Guerrero con la Maga activa, así que la captura muestra la mochila de la Maga); lo corregí en `shot-v4.mjs` sin volver a capturar. Tras la captura agrandé el icono ⚒.

**Modelo propio [D] v4:** `calc-r2.mjs` (◆, paridad por clase y por pool, cuotas O6, topes y vida al golpear) y `calc-r2-econ.mjs` (mejora, Afinar, ★, apuesta, Polvo, gemas y Chispas). Reproducen `combat-math.js`, `recompute` y `resources.js` de `paso2-impl` 4095ab6 con supuestos declarados (fracciones del DPS: básico 30 %, con enfriamiento 40 %, limitado por recurso 20 %; saco aditivo 60 fuera del equipo; equipo típico = composición media de cada pool).

**Código (solo lectura, `paso2-impl` 4095ab6):** `js/items.js:7-61, 196-272, 440-475`; `js/combat-math.js:43-96, 120-135, 465-562`; `js/resources.js:1-110`; `js/entities.js:750-976, 989-993, 1255-1264`; `js/economy.js:473-585`; `js/paragon-board.js:1-60`; `js/skill-resolve.js:50-110`; `js/skill-defs.js:147-215`; `js/spec-mechanics.js:187-210`; `js/talents.js:440-525`; `js/skills-guerrero.js:27-200, 400-615`; `js/skills-maga.js:32-91, 795-913`; `js/skills-arquera.js:32-44, 793-806`; `js/data.js:81-118`; `js/progression.js:10-25`.
