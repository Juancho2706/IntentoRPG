# Paso 2g: coherencia de la Maga (kit base, kit de especialización y talentos), documento de diseño

> Estado: **diseño**, sin código del juego. Fecha: 2026-10-20. Alcance: la **Maga Piromante completa**. Crionte y Arcanista quedan esbozados (§5). Guerrero y Arquera, pendientes de rehacer.
> Mockup: `docs/mockups/skills-ux.html` (clase Maga). Pasó **tres rondas de refutación** con capturas (§10).
> Insumos:
> - `CLAUDE.md` y `MEMORIA.md` §7/§8;
> - `docs/paso2-diseno.md` (§1, §3.2, §5, §7 y §8) y `docs/paso2f-habilidades-ux.md` (forja);
> - `js/skills-maga.js`, `js/talents-maga.js`, `js/powers-maga.js` y `js/spec-mechanics.js`.

## 0. Resumen

**La queja del dueño.**
- Las habilidades y los talentos «se pelean».
- El kit de la Maga sin especialización trae cosas fuertes de fuego, como la Estela Ígnea, que «no tienen nada».
- El árbol de clase no tiene que ver con las habilidades básicas.
- El panel de talentos no sigue la regla de poco texto del libro.

**El diagnóstico (§2).** Hoy la Maga tiene **30 activas**:
- 14 en el libro;
- 16 concedidas por talentos, que compiten por las mismas 6 ranuras (solo la `2` admite **9**).

Además:
- **Las tres especializaciones comparten un libro** con lo fuerte de los tres elementos: Meteoro, Supernova, Estela Ígnea, Tormenta…
- **Cuatro talentos repiten una variante de la forja:**
  - Carámbanos repite Saeta Gélida;
  - Cadena de Rayos repite Rayo en Cadena;
  - Misiles Arcanos repite Haz Concentrado;
  - Ventisca repite Ventisca Anclada.
- **Tres nombres chocan:**
  - «Fénix» es a la vez un nodo y una variante;
  - «Singularidad» es a la vez un ápice y una variante;
  - «Combustión» es a la vez Combustión Rápida y Combustión.
- **Un nodo de clase depende de la especialización:** Conducto Elemental, `@spec`.

**El modelo nuevo (§3): tres capas, cada una con un solo trabajo.**

| Capa | Qué es | Qué contiene |
|---|---|---|
| **Libro: kit base de la Maga** | Lo que sabe toda Maga desde el Nv1, sin especialización | Un hechizo sencillo por elemento: **Dardo Arcano** (arcano), **Bola de Fuego** (fuego) y **Nova de Hielo** (hielo). Más utilidad arcana: **Parpadeo** (movilidad) y **Barrera de Maná** (defensa). Llena `IZQ`, `DER`, `1` y `2` del Nv1 al Nv9 |
| **Libro: kit de especialización** | Se desbloquea **al elegir** la especialización (Nv10) y por nivel | Piromante: **Llamarada** (insignia, `3`), **Estela Ígnea** (`1`), **Meteoro** (`DER/2`) y **Supernova** (`4`). Las de otra especialización se ven bloqueadas con su emblema |
| **Talentos** | **Solo pasivas.** Ningún nodo concede activas | **Árbol de clase:** el kit base arcano (Dardo, Parpadeo, Barrera) y lo genérico (maná, defensa, control). **Árbol del Piromante:** su kit, la Bola de Fuego (la base de su elemento), la Quemadura y el Calor |
| **Forja** (Mejora + 2 variantes, Paso 2f) | Cómo se usa cada habilidad del libro | Forma, elemento y ritmo. Un talento nunca repite una variante (§3.4) |

**Qué se borra o se mueve en la Maga (§4.7).**
- **Pasan a variantes de la forja:**
  - Ascua → Saeta Ígnea;
  - Toque Gélido → Saeta Gélida;
  - Armadura de Hielo → variantes de Barrera de Maná;
  - Onda Repulsora → Parpadeo Disruptor;
  - Muro de Fuego → Muro de Llamas (Estela Ígnea).
- **Pasan a pasivas:**
  - Combustión → nodo clave que se dispara con Ignición Total;
  - Contrahechizo → Disrupción;
  - Bloque de Hielo → automático.
- **Desaparecen:**
  - Inversión del Tiempo y Llama Viva (+1 %/rango, invisible);
  - Conducto Elemental (`@spec`).
- **Pasan al libro:** Parpadeo y Barrera, como habilidades base con forja. Llamarada, como habilidad del libro del Piromante.

**UX.**
- El libro se ordena por **origen**: kit base · tu especialización · otras especializaciones bloqueadas.
- El panel de talentos de la Maga usa las reglas del libro:
  - cada nodo lleva icono, nombre corto y rango;
  - todo el texto va en el tooltip rico;
  - `Alt` muestra el detalle;
  - no hay párrafos.
- Pasar el ratón por una habilidad ilumina en los dos árboles los nodos que la tocan.

---

## 1. Investigación (consultada el 2026-10-20)

| Fuente (fecha) | Juego | Qué hace | Qué tomamos / qué evitamos |
|---|---|---|---|
| [Wowhead: notas de desarrollo de la alfa de Midnight (2025-10-01)](https://www.wowhead.com/ptr-2/news/midnight-alpha-development-notes-378688) | WoW Midnight | Busca «reducir el exceso de botones y auras en el núcleo del Mago». Saca del **árbol de clase** nodos de daño elemental como Supernova y Blast Wave, además de Displacement e Ice Floes. Consolida defensivos. Cada especialización pierde 13–21 talentos | **El árbol de clase no lleva daño elemental**: es utilidad y defensa común. Menos botones: 30 activas → 17 en la Maga |
| [Warcraft Tavern: talentos Apex en Midnight (2025-10-02)](https://www.warcrafttavern.com/wow/news/apex-talents-talent-tree-changes-coming-in-world-of-warcraft-midnight/) | WoW Midnight | Tres capas: clase, especialización y héroe. Los Apex (4 puntos, tras el Nv81) se centran en «la fantasía y la mecánica central» de cada especialización | Nuestro Ápice ya existe (x1–x3). Se refuerza que los nodos de especialización hablen de **su** mecánica: Quemadura y Calor |
| [Icy Veins: guía del Mago de Fuego en Midnight (consultada 2026-10-20)](https://www.icy-veins.com/wow/fire-mage-midnight-guide) | WoW Midnight | Fuego: se elimina Phoenix Flames y Fireball dobla su daño. Combustion queda como ventana de ráfaga ligada a su recurso. Frostfire pasa a potenciar Fuego y Hielo «sin taparlos» | Cuando dos sistemas se cruzan entre elementos, se acercan al núcleo de cada especialización. **Combustión ligada al recurso** y no como botón suelto |
| [DiabloBytes: rework del árbol de habilidades (2026-04-28)](https://www.diablobytes.com/diablo-iv/guides/skill-tree-rework/) y [la división que generó (2026-04-30)](https://diablobytes.com/diablo-iv/news/2026-04-30-diablo-4-lord-of-hatreds-allnew-class-skill-trees-divided/) | Diablo 4 · Lord of Hatred | Base → mejora → rama que **cambia la identidad** (elemento o tipo de daño, y con ello los tags). Desaparecen los Key Passive. Respec gratis al cambiar de sistema. Críticas: hay que reaprender, y se pierde el nodo definitorio de algunas builds | **La forja transforma** (elemento o forma) y el talento ya no lo hace. Ningún arquetipo pierde su pieza central: Combustión, Fénix y Conflagración siguen, en su capa |
| [Maxroll: pasivas y habilidades de Last Epoch (act. 2026-03-27)](https://maxroll.gg/last-epoch/resources/passives-and-skills) y [AFK Gaming: maestrías (consultada 2026-10-20)](https://afkgaming.com/gaming/general/a-guide-to-unlocking-mastery-classes-in-last-epoch) | Last Epoch | Árbol base de la clase desde el inicio. La maestría **concede su habilidad insignia al elegirla** y desbloquea las demás exclusivas, que no existen en otra maestría. La ventana de habilidades muestra qué se desbloquea y cómo. Las habilidades sin especializar también van a la barra | El modelo más cercano a lo que pide el dueño: **kit de especialización que solo existe con ella**, insignia al elegir, y el libro enseña lo bloqueado y por qué |
| [PoE Vault: ascendencias antes del Druida (sin fecha; parche 0.4, 2025-12)](https://www.poe-vault.com/poe2/news/path-of-exile-2-updates-all-ascendancies-ahead-of-druid) · [Mobalytics: clases y ascendencias (2026-05-23)](https://mobalytics.gg/blog/path-of-exile/12-classes-and-36-ascendancies/) · [Steam (2024)](https://steamcommunity.com/app/2694490/discussions/0/4628106985313755471/?ctp=3) | Path of Exile 2 | Las gemas no están atadas a la clase y la identidad la pone la ascendencia. Desde 0.4, las habilidades que concede una ascendencia se activan solas al desbloquearse. Crítica: con todo abierto, la clase dice poco | **Evitar el «todo para todos»**: es justo lo que pasaba con Supernova o Tormenta en cualquier especialización. Tomamos que lo que concede la especialización **se activa solo** |
| [Maxroll: Ark Passive (2024-11-29)](https://maxroll.gg/lost-ark/news/ark-passive-changes-kr-11-27) · [Mein-MMO: grabados (2022)](https://mein-mmo.de/en/lost-ark-how-the-engravings-work-to-empower-your-character,784521/) | Lost Ark | Hay grabados de combate para todos y **2 grabados de clase por subclase** que definen el estilo, más una mecánica de identidad. Crítica: brechas del 20 % de DPS según el reparto de puntos | La **mecánica de identidad** (Calor) es el pegamento entre el kit y el árbol. Evitar nodos obligatorios que deciden el 20 % del daño |

**Lagunas.**
- No encontré la lista definitiva de hechizos base del Mago en Midnight.
- Tampoco encontré los cambios finales de interfaz de los tooltips en Lord of Hatred ni en Last Epoch.
- Varias fuentes de Icy Veins y Mobalytics se leyeron solo por su resumen de búsqueda.

**Síntesis.**
- Todos los juegos que funcionan separan **qué haces** (habilidades, que son pocas y con dueño claro) de **cuánto y con qué se combina** (pasivas).
- La especialización **trae su kit**: Last Epoch, WoW y la ascendencia de PoE2.
- El árbol común **no lleva daño elemental**: WoW Midnight.
- **Errores conocidos:**
  - árboles con activas que compiten por botones (el exceso de botones de WoW);
  - nodos que repiten otro sistema;
  - nodos de porcentaje invisibles;
  - quitar el nodo definitorio de una build.

---

## 2. Auditoría de la Maga actual

### 2.1 Matriz: cada activa, quién la toca y dónde debe vivir

Leyenda de destino: **BASE** (kit base de clase) · **PIRO / CRIO / ARCA** (kit de esa especialización) · **→ forja** (pasa a variante) · **→ pasiva** (pasa a nodo) · **✕** (se elimina).

| # | Habilidad | Elem · categoría · Nv | Nodos de clase | Nodos de especialización | Forja (I / II, 2f) | Destino | Conflicto |
|---|---|---|---|---|---|---|---|
| 1 | Dardo Arcano | arcano · básico · 1 | (c1 `@all`) | Crionte s7 Carámbanos · Arcanista s0, s6B Arco Voltaico, s15 Sobretensión | Saeta Ígnea / Saeta Gélida | **BASE** | Carámbanos **repite** Saeta Gélida (la convierte en Escarcha). Arco Voltaico y Sobretensión **cambian la forma** desde un talento |
| 2 | Ascua | fuego · básico · 3 | — | Piromante (`@fire`, s0) | Ascua Saltarina / Carbón Encendido | **→ forja** (Saeta Ígnea) | Básico de fuego en el kit común que solo rinde con Piromante. Duplica el papel de Saeta Ígnea |
| 3 | Toque Gélido | hielo · básico · 8 | — | Crionte (capas) | Congelación / Mordisco Glacial | **→ forja** (Saeta Gélida) | Duplica Saeta Gélida. Mordisco Glacial (`coldblood`) repite el s12 Filo Cristalino del Crionte |
| 4 | Bola de Fuego | fuego · gastadora · 2 | — | Piromante s2 | Pirodardo / Racimo | **BASE**, con su explosión grande como pasiva del Piromante | **Salpicadura del 350 % en el kit común**: fuego fuerte sin especialización (subida en 2e para el área del Piromante) |
| 5 | Rayo | arcano · gastadora · 8 | — | Arcanista s0, s2, s10, x1 | Rayo en Cadena / Haz Concentrado | **ARCA** (esbozo) | Rayo en Cadena **repite** x1 Cadena de Rayos. Haz Concentrado **repite** Misiles Arcanos |
| 6 | Nova de Hielo | hielo · gastadora · 14 | — | Crionte s2, s6B, s11, s16, x1 | Corazón de Hielo / Nova Fracturante | **BASE** (Nv8) | Nova Fracturante se solapa con el s5 Sangre Fría del Crionte. Témpano (s6B) le **cambia la forma** desde un talento |
| 7 | Meteoro | fuego · gastadora · 14 | — | Piromante s7, s10 | Lluvia de Meteoritos / Meteoro Ancestral | **PIRO** | Fuego fuerte en el kit común |
| 8 | Paso de Escarcha | hielo · movilidad · 4 | — | — | Paso Doble / Prisión Fugaz | **CRIO** (esbozo) | Compite en `1` con Parpadeo (c3) y Estela Ígnea |
| 9 | Estela Ígnea | fuego · movilidad · 12 | — | — | Senda de Llamas / **Fénix** | **PIRO** | Es **el ejemplo del dueño**. Su variante «Fénix» se llama igual que el nodo s13A Fénix |
| 10 | Armadura de Hielo | hielo · defensa · 6 | — | (parecida a Crionte s8) | Armadura Reactiva / Coraza Arcana | **→ forja** (variantes de Barrera) | Dos defensas «base» (Armadura y la Barrera de c2) en la misma ranura |
| 11 | Onda Repulsora | arcano · utilidad · 12 | — | — | Implosión / Escudo Repulsor | **→ forja** (Parpadeo Disruptor) | Utilidad suelta que compite en `2` con 6 activas más |
| 12 | Supernova | fuego · definitiva · 15 | — | Piromante s10, s16, x3 | Sol Errante / Colapso | **PIRO** | Definitiva de fuego que pueden elegir el Crionte y la Arcanista |
| 13 | Tormenta Glacial | hielo · definitiva · 15 | — | — | **Ventisca** Anclada / Granizo | **CRIO** (esbozo) | Ventisca Anclada **repite** la activa Ventisca (s6A) |
| 14 | Desgarro Arcano | arcano · definitiva · 15 | — | — | Brecha / **Singularidad** | **ARCA** (esbozo) | «Singularidad» es también el nombre del ápice x3 de la Arcanista |
| 15 | Barrera de Maná | arcano · defensa · c2 (1.er punto Nv11) | c2 (concede), c7 (la potencia) | — | — (talento) | **BASE** (Nv6, con forja) | Activa de talento que compite en `2`. c7 depende de que compres otra activa |
| 16 | Parpadeo | arcano · movilidad · c3 | c3 (concede) | — | — | **BASE** (Nv4, con forja) | Compite en `1` con Paso de Escarcha y Estela Ígnea |
| 17 | Contrahechizo | arcano · utilidad · c5A | c5 | — | — | **→ pasiva** (c5B Disrupción) | 3.ª activa de clase en `2` |
| 18 | Inversión del Tiempo | arcano · defensa · c12A | c12 | — | — | **✕** (lo cubren Fénix y Bloque automático) | 4.ª activa de clase en `2` |
| 19 | Bloque de Hielo | hielo · defensa · c12B | c12 | — | — | **→ pasiva** (c12A automático) | 5.ª activa de clase en `2` |
| 20 | Llamarada | fuego · insignia · s0 | — | s0 (la concede), s4 | — (sin forja) | **PIRO** (libro, insignia con forja) | La concede un nodo «gratis»: es un talento que en realidad es una habilidad |
| 21 | Combustión | fuego · especialización · s9 | — | s9 (activa + poder) | — | **→ pasiva** (nodo clave s9 ligado a Ignición Total) | Activa de 90 s que **no entra en la barra del banco** (`3` = Llamarada): un nodo trampa. Además, «Combustión» choca con s2 «Combustión Rápida» |
| 22 | Muro de Fuego | fuego · utilidad · s13B | — | s13B | — | **→ forja** (Estela Ígnea II, Muro de Llamas) | Compite en `2`/`3` |
| 23 | Prisión de Hielo | hielo · insignia · s0 Crionte | — | s0, s4, s10, x3 | — | **CRIO** (libro) | Como la 20 |
| 24 | Lanza de Hielo | hielo · gastadora · s9 Crionte | — | s9, s12 | — | **CRIO** (libro) | Gastadora de especialización escondida en un nodo |
| 25 | Ventisca | hielo · especialización · s6A Crionte | — | s6A | — | **✕** (Tormenta: Ventisca Anclada) | Repetida |
| 26 | Aliento Boreal | hielo · utilidad · s13B Crionte | — | s13B | — | **✕** (su cono, en el esbozo del Crionte) | Compite en `2`/`3` |
| 27 | Orbe Arcano | arcano · insignia · s0 Arcanista | — | s0, s4, s7, s17 | — | **ARCA** (libro) | Como la 20 |
| 28 | Misiles Arcanos | arcano · gastadora · s6A Arcanista | — | s6A, s17 | — | **✕** (Rayo: Haz Concentrado) | Repetida |
| 29 | Sello del Archimago | arcano · especialización · s9 Arcanista | — | s9 | — | **ARCA** (libro) | — |
| 30 | Evocación | arcano · utilidad · s13A Arcanista | — | s13A | — | **✕** (el maná lo cubren Flujo y Escudo de Maná) | Compite en `2`/`3` |

### 2.2 Conflictos por tipo

| Tipo | Casos | Cómo se resuelve |
|---|---|---|
| **Habilidad elemental fuerte en el kit común** | Meteoro, Supernova, Estela Ígnea, Tormenta Glacial, Desgarro Arcano, Rayo, Paso de Escarcha y la Bola de Fuego con 350 % | Cada una pasa al kit de **su** especialización. La Bola de Fuego queda en el kit base al 100 %; el Piromante la sube al 350 % |
| **Nodo de clase que toca la especialización** | c9 Conducto Elemental (`skillLv: '@spec'`) | Se elimina. En su sitio va c9 Ritmo Arcano, que solo toca el kit base |
| **Talento que repite una variante** | Carámbanos ↔ Saeta Gélida · Cadena de Rayos ↔ Rayo en Cadena · Misiles ↔ Haz Concentrado · Ventisca ↔ Ventisca Anclada · Fénix (s13A) ↔ Fénix (Estela) · Sangre Fría ↔ Nova Fracturante (solape) | Gana la capa que corresponde según la regla de §3.4. La forma va a la forja; los números y la fantasía, al talento |
| **Talento que cambia la forma de una habilidad** | Carámbanos (elemento), Arco Voltaico (rebote), Sobretensión (perforar), Témpano (anillo que empuja) | Se mueven a la forja o desaparecen: Piromante ya, Crionte y Arcanista en su etapa |
| **Activa de talento que compite por ranura** | 16 activas de talento (5 de clase, 3 + 4 + 4 de especialización). La ranura `2` admite **9** | **Ningún nodo concede activas.** Las 17 activas que quedan viven en el libro con dueño claro. La `2` del Piromante tiene 4 opciones: Barrera, Nova, Bola o Meteoro |
| **Nombres repetidos** | Fénix ×2 · Singularidad ×2 · Combustión ×3 · Concentración (Piromante s6B = mecánica de la Francotiradora = Arcanista s12) · Ventisca ×2 | Un nombre por cosa. En el Piromante: Mecha Corta, Brasa Profunda y Muro de Llamas |
| **Nodos invisibles** | s1 Llama Viva (+1 %/rango tras 2e: +3 % en total) | Se elimina |
| **Nodos trampa** | s9 Combustión: una activa que nadie pone en la barra | Pasa a pasiva ligada al Calor, así trabaja siempre |

---

## 3. Modelo de capas

### 3.1 Reglas (las que valida el test, §8)

1. **Libro = todas las activas.** Cada activa tiene **un dueño**: `spec: null` (kit base) o `spec: '<id>'` (kit de esa especialización). Ningún talento concede activas (`fx.grant` desaparece de la Maga).
2. **Kit base = lo que sabe toda Maga.** Un hechizo **sencillo** por elemento, más utilidad arcana (movilidad y defensa). Llena `IZQ`, `DER`, `1` y `2` del Nv1 al Nv9.
3. **Kit de especialización = su fantasía fuerte.** Llega **al elegir** la especialización (Nv10) y por nivel: insignia Nv10, movilidad o utilidad Nv12, gastadora Nv14, definitiva Nv15. Las de otra especialización se ven **bloqueadas con su emblema**.
4. **Árbol de clase = el kit base que usan todas.** Toca el kit arcano (Dardo, Parpadeo y Barrera) y lo genérico (maná, defensa, control, enfriamiento, crítico). **No toca** la Bola de Fuego ni la Nova: la especialización de su elemento ya las potencia, y para las otras dos especializaciones serían nodos muertos. **Ningún nodo nombra una habilidad de especialización** ni usa `@spec`.
5. **Árbol de especialización = su kit, más la habilidad base de su elemento, más su mecánica.** El Piromante toca Llamarada, Estela, Meteoro, Supernova, Bola de Fuego, la Quemadura y el Calor.
6. **La mecánica une las dos capas.** El Calor se llena con el Fuego (Bola del kit base, Saeta Ígnea, Llamarada, Meteoro y Estela) y se gasta en Bola o Meteoro. Los nodos s4 y s9 la potencian.
7. **La forja transforma; el talento añade o multiplica** (§3.4).
8. **Una definitiva por especialización.** Se elige su variante, no otra definitiva. *Por qué:* «Supernova en un Crionte» era el caso más claro de capas que se pelean. La variedad se mantiene con 2 variantes por definitiva.

### 3.2 Ranuras: quién va dónde y cuándo cede el kit base

| Ranura | Nv1–9 (sin especialización) | Piromante (Nv10+) | Regla de cesión |
|---|---|---|---|
| `IZQ` | Dardo Arcano | Dardo Arcano. Con Saeta Ígnea alimenta Quemadura y Calor (★ recomendada) | El básico es siempre el de la clase. La especialización solo **recomienda** su variante |
| `DER` | Bola de Fuego (Nv2) | Bola de Fuego (con 350 % de explosión) o Meteoro | Meteoro (Nv14) se **ofrece** (★ y aviso) pero no sustituye solo |
| `1` | Parpadeo (Nv4) | Parpadeo o **Estela Ígnea** (Nv12) | Igual: se ofrece |
| `2` flexible | Barrera de Maná (Nv6) o Nova de Hielo (Nv8) | Barrera, Nova, Bola o Meteoro (segunda gastadora) | Igual |
| `3` | Cerrada: «Nv10 · especialización» | **Llamarada** | **Se llena sola** al elegir la especialización: es suya y no hay kit base que desplazar |
| `4` | Cerrada: «Nv15» | **Supernova** | **Se llena sola** al aprenderla |

- **Regla general:** el kit de especialización **ocupa solo** las ranuras vacías (`3`, `4` y cualquier hueco).
- Las ocupadas por el kit base **no se tocan**: la novedad lleva ★ en el libro y la ranura parpadea una vez.
- El botón **Recomendado** del libro aplica la barra y las variantes sugeridas de la especialización: `IZQ` Dardo (Saeta Ígnea) · `DER` Bola (Racimo) · `1` Estela · `2` Meteoro · `3` Llamarada (Erupción) · `4` Supernova (Sol Errante).

### 3.3 Calendario Nv1–21 (Maga Piromante) y qué ve el jugador

| Nv | Novedad | Nv | Novedad |
|---|---|---|---|
| 1 | Dardo Arcano | 11 | Mejora de Nova · **1.er punto de clase** |
| 2 | Bola de Fuego | 12 | **Estela Ígnea** · variantes de Barrera |
| 3 | — | 13 | Mejora de Llamarada |
| 4 | Parpadeo · Mejora de Dardo | 14 | **Meteoro** · variantes de Nova |
| 5 | Mejora de Bola | 15 | **Supernova** · Mejora de Estela |
| 6 | Barrera de Maná | 16 | Variantes de Llamarada |
| 7 | Variantes de Dardo · Mejora de Parpadeo | 17 | Mejora de Meteoro |
| 8 | Nova de Hielo · variantes de Bola | 18 | Mejora de Supernova · variantes de Estela |
| 9 | Mejora de Barrera | 20 | Variantes de Meteoro |
| 10 | **Especialización: Llamarada** · variantes de Parpadeo · 1.er punto de especialización | 21 | Variantes de Supernova |

**Antes de elegir (Nv1–9).**
- El libro muestra el **kit base** (3–5 casillas, con «Nv6»/«Nv8» bloqueadas) y una sección **«Especialización · eliges una al nivel 10»**.
- Esa sección tiene 3 filas, cada una con emblema, rol, mecánica y los 4 iconos de su kit en gris.
- La barra muestra `2`, `3` y `4` cerradas con su nivel (captura `final_libro_05_1366.png`).
- Talentos (`N`) abre directamente el **selector de especialización** en modo vista previa. Cada tarjeta dice «Desbloquea en el libro», con sus 4 habilidades, su mecánica y su pasiva (`final_spec_05_1920.png`).

**Se elige al Nv10** (sin cambio). Al llegar sale un aviso único: «Elige tu especialización (N)». *Por qué no antes:*
- el kit base necesita 9 niveles para enseñar sus cinco piezas y la ranura flexible;
- todas las clases ya están calibradas con la especialización en el Nv10;
- la ranura `3` existe para eso.

**Al cambiar de especialización** (gratis fuera de combate, como hoy):
1. El kit de la anterior sale del libro (vuelve a «Otras especializaciones») y entra el nuevo.
2. La barra **cambia ranura por ranura según su papel**: insignia → insignia (`3`), definitiva → definitiva (`4`), movilidad → movilidad, gastadora → gastadora. Si la nueva no tiene una del mismo papel (la Arcanista no tiene movilidad propia), cae al kit base (Parpadeo).
3. **El kit base no se toca.** La forja elegida de cada habilidad se **conserva**, guardada por habilidad (`skillForge`).
4. La pasiva de la especialización cambia: la Bola de Fuego vuelve al 100 % fuera del Piromante. El tooltip y la forja la muestran.
5. Los talentos de clase se conservan. Los de especialización se guardan por especialización (`talents.sp[id]`, ya existe).
6. Sale la tira de aviso de 2f (§3.8), ahora con «kit: −4 / +4».

### 3.4 Regla escrita: forja frente a talento

| Va en la **forja** (cómo se usa) | Va en el **talento** (cuánto y con qué se combina) |
|---|---|
| Cambiar la **forma**: cono ↔ anillo ↔ proyectil ↔ canalizado, de un impacto a varios | **Números**: +X % de daño, −X s de enfriamiento, +X s de duración, +radio |
| Cambiar la **geometría**: ángulo, alcance, radio con contrapartida | **Añadir** un efecto que no cambia la forma: un charco (Pira), una explosión al matar o una cura al matar |
| Cambiar el **elemento** y los tags (Saeta Ígnea) | La **mecánica** de la especialización: Quemadura, Calor, Ignición Total, capas |
| Cambiar el **ritmo**: cargas, preparación, potencia frente a enfriamiento | **Sinergias entre habilidades**: «los críticos del Dardo bajan el enfriamiento de Parpadeo» |
| Cambiar el **papel**: UNI ↔ ÁREA ↔ CONTROL ↔ AGUANTE | **Economía y supervivencia** generales: maná, reducción de daño, renacer |

**Prohibido:**
- un talento que cambie forma, elemento, rebote, perforación o cargas;
- una variante que dependa de la mecánica de una especialización (las variantes valen para cualquiera; la especialización solo las **recomienda**);
- dos cosas con el mismo nombre en la misma clase.

*Comprobable:* §8 G5.

---

## 4. Piromante completo

### 4.1 Catálogo final (números de partida)

`WD` = daño de arma. Coeficientes como en `skills-maga.js`. Rango por nivel sin cambios.

| id | Nombre | Dueño · categoría · ranura | Nv | Coef. | Coste · enfr. | Efecto (línea del libro) | Cambio respecto de hoy |
|---|---|---|---|---|---|---|---|
| `m_dardo` | Dardo Arcano | base · básico · `IZQ` | 1 | 1,05 | +3 maná · cadencia 1,1 s | Dardo arcano a distancia; recupera Maná al impactar | Ninguno. La Mejora ya no da maná (lo da el árbol de clase) |
| `bola_fuego` | Bola de Fuego | base · gastadora · `DER/2` | 2 | 2,2 + **1,0** a 2 m | 18 · 1,5 s · prep. 0,3 s | Esfera ardiente que explota a 2 m | **Salpicadura 3,5 → 1,0** en el kit base. El Piromante la recupera (3,5) con su pasiva |
| `nova_hielo` | Nova de Hielo | base · gastadora · `DER/2` | **8** (era 14) | 1,4 r 3,3 | 25 · 4 s | Onda gélida que ralentiza 30 % 3 s | Pasa al kit base y se aprende antes |
| `m_parpadeo` | Parpadeo | base · movilidad · `1` | **4** | — | — · **12 s** | Teletransporte de 8 m al cursor; atraviesa enemigos | **Nuevo id** (era `m_t_parpadeo`, talento c3). Enfriamiento 15 → 12 s para competir con Estela (10 s) |
| `m_barrera` | Barrera de Maná | base · defensa · `2` | **6** | — | — · 20 s | Escudo del 60 % del maná máximo durante 8 s | **Nuevo id** (era `m_t_barrera`, talento c2) |
| `p_llamarada` | Llamarada | Piromante · insignia · `3` | 10 | 1,5 cono 7 m 70° | 25 · 8 s · prep. 0,1 s | Cono de fuego que detona las Quemaduras (60 % de lo que les queda) | Pasa al libro (`spec:'piromante'`). Ya no la concede s0. **Gana forja** |
| `m_estela_ignea` | Estela Ígnea | Piromante · movilidad · `1` | 12 | 0,4/s × 3 s | — · 10 s | Desliz de 6 m dejando fuego | Solo con Piromante |
| `meteoro` | Meteoro | Piromante · gastadora · `DER/2` | 14 | 3,7 r 3 | 40 · 6 s · cae a 0,6 s | Meteoro sobre la zona | Solo con Piromante |
| `m_u_supernova` | Supernova | Piromante · definitiva · `4` | 15 | 3 × 4,7 + Quemadura 12 en 6 s | — · 50 s | Estrella que estalla en 3 ondas y quema | Solo con Piromante. Es la definitiva del Piromante |

**Pasiva de la especialización** («innata», no es un nodo): **la explosión de la Bola de Fuego sube del 100 % al 350 %**.
- La aplica `p_ignicion` (nodo gratis s0) con `modifyResolve` sobre `bola_fuego`, sin motor nuevo.
- Se ve como chip en la forja, en el tooltip de la Bola y en la sección del Piromante del libro.

**Mecánica: Calor** (sin cambios en `spec-mechanics.js`; el disparo de s9 lo hace su propio poder):
- **Generar:** +5 por golpe de Fuego, una vez por instante.
- **Descargar:** a 100, Ignición Total: la siguiente Bola de Fuego o Meteoro es gratis y crítica.
- **Pérdida:** −10/s tras 3 s sin ganar.

### 4.2 Forja del kit (Mejora Nv+3 · variantes Nv+6)

| Habilidad | Mejora | Variante I | Variante II |
|---|---|---|---|
| Dardo Arcano | **Dardo Veloz**: +40 % de velocidad del proyectil y +2 m de alcance | **Saeta Ígnea** · ÁREA: se vuelve de Fuego y estalla a 1,5 m (30 %). `★elem fire · ★set{splash:.3, radius:1.5}`. Absorbe a Ascua | **Saeta Gélida** · CONTROL: se vuelve de Hielo; ralentiza 20 % 1,5 s, −10 %. Absorbe a Toque Gélido |
| Bola de Fuego | Núcleo Inestable: explosión 2 → 2,6 m | Pirodardo · UNI | Racimo · ÁREA (como 2f) |
| Nova de Hielo | Escarcha Profunda: 30 → 40 % | Corazón de Hielo · AGUANTE | Nova Fracturante · UNI (como 2f) |
| Parpadeo | **Salto Largo**: 8 → 10 m | **Doble Parpadeo** · MOVILIDAD: 2 cargas (12 s cada una). `★charges 2` | **Parpadeo Disruptor** · CONTROL: al llegar empuja 3 m y aturde 0,5 s (80 %). `behavior v_parpadeo_onda` = el `m_onda` de hoy. Absorbe a Onda Repulsora |
| Barrera de Maná | **Burbuja Estable**: 8 → 10 s | **Barrera Gélida** · CONTROL: se vuelve de Hielo; al romperse congela 1,5 s a 3 m. `★power v_reactiva`. Absorbe a Armadura Reactiva | **Coraza Arcana** · UNI: mientras aguanta, +15 % de daño de hechizos. `★power v_coraza_arcana` |
| Llamarada | **Llama Ancha**: cono 70 → 90° | **Lanza de Llamas** · UNI: cono de 25° y 10 m, +50 %. `★set{angle:25, radius:10} · dmg +50` | **Erupción** · ÁREA: anillo de 5 m a tu alrededor, −15 %. `★set{type:area, at:self, radius:5}` |
| Estela Ígnea | Rastro Ardiente: 3 → 4 s | Senda de Llamas · ÁREA | **Muro de Llamas** · CONTROL: el rastro corta el paso 3 s (no a jefes), −50 % de daño. Campo `p_muro_fuego` con `blocks`. Absorbe a Muro de Fuego. **Sustituye a «Fénix»** |
| Meteoro | Puntería Ígnea | Lluvia de Meteoritos · ÁREA | Meteoro Ancestral · UNI (como 2f; no choca con Pira) |
| Supernova | Gravedad Solar | Sol Errante · ÁREA | Colapso · UNI (como 2f) |

Variantes recomendadas del Piromante: Dardo **I**, Bola **II**, Llamarada **II**, Meteoro **I** y Supernova **I**. Ninguna apaga el Calor (regla 7 de §7 de 2f).

### 4.3 Árbol de clase de la Maga, rehecho (15 nodos; misma rejilla y puertas: 6 puntos → fila 4 y 12 → fila 6)

Rangos máximos 28 para 20 puntos (+3 por hazañas): obliga a elegir. «Existe» = clave o poder ya implementado.

| id | Fila · col | Nombre (icono) | Tipo · rangos | Efecto por rango | Toca | Implementación | Requiere |
|---|---|---|---|---|---|---|---|
| c1 | 0 · 1,5 | Intelecto Arcano (c1) | pasiva · 2 | +4 % de daño de hechizos | (todo) | `mod @all {dmg:4}` · existe | — |
| c2 | 1 · 0,5 | **Escudo Prismático** (arte de c7) | pasiva · 2 | −10 % de daño recibido con la Barrera activa | Barrera | `tv.barrierDr 10` · existe (era c7) | c1 |
| c3 | 1 · 2,5 | **Reflejos Arcanos** (c3) | pasiva · 2 | Parpadeo: −1,5 s de enfriamiento | Parpadeo | `mod m_parpadeo {cdr:12.5}` · claves existentes | c1 |
| c4 | 2 · 0 | Mente Afilada (c4) | pasiva · 3 | +2 % de crítico | — | `stats {crit:2}` · existe | c2 |
| c5 | 2 · 1,5 | **Ralentizar o Disrupción** (c5) | elección | A: cada 8 s tu siguiente hechizo ralentiza 50 % 4 s · B: cada 10 s tu siguiente Dardo interrumpe y silencia 3 s (jefes: +20 de stagger) | B: Dardo | A `m_ralentizar` (existe) · B `m_disrupcion` **nuevo** (la lógica del comportamiento `m_t_contrahechizo`) | c2 o c3 |
| c6 | 2 · 3 | Reservas Profundas (c6) | pasiva · 2 | +8 % de maná máximo | — | `stats {mpPct:8}` · existe | c3 |
| c7 | 3 · 0,5 | **Piel de Maná** (arte de c2) | pasiva · 2 | Con más del 50 % de maná, −5 % de daño recibido | — | `tv.drHighMana 5` · existe (**sale de Arcanista s8**: es genérica) | c4 o c5 |
| c8 | 3 · 2,5 | Presencia Mental (c8) | pasiva · 2 | −4 % de enfriamiento | — | `stats {cdr:4}` · existe | c5 o c6 |
| c9 | 4 · 0 | **Ritmo Arcano** (c9) | pasiva · 2 | Los críticos del Dardo bajan 0,25 s el enfriamiento de Parpadeo y Barrera | Dardo · Parpadeo · Barrera | `tv.dartCritCdr` **nuevo** en `nucleo_tv` (copia de `critFireCdr`) | c7 |
| c10 | 4 · 1,5 | Flujo de Maná (c10) | pasiva · 3 | +1 de maná al golpear | — | `stats {mph:1}` · existe | c7 o c8 |
| c11 | 4 · 3 | Celeridad (c11) | pasiva · 2 | +4 % de velocidad de lanzamiento | — | `stats {aspdPct:4}` · existe | c8 |
| c12 | 5 · 0,5 | **Bloque de Hielo o Escudo de Maná** (c12) | elección | A: bajo el 25 % de vida, hielo 2 s inmune (cada 90 s) · B: el 20 % del daño recibido lo paga tu maná | — | A `m_bloque_auto` **nuevo** (④ `onDamaged` + el comportamiento `m_t_bloque`) · B `m_escudo_mana` **nuevo** (④) | c9 o c10 |
| c13 | 5 · 2,5 | Erudición (c13) | pasiva · 2 | +3 % de daño a élites y +6 % de experiencia | — | existe | c10 o c11 |
| c14 | 6 · 1,5 | Maestría Arcana (c14) | pasiva · 1 | Hechizos de más de 20 de maná: −15 % de coste | — | `tv.costRedBig` · existe | c12 o c13 |
| c15 | 7 · 1,5 | Aura de Intelecto (c15) | clave · 1 | Grupo a 15 m: +5 % de daño y +10 % de maná | — | `m_aura_intelecto` · existe | c14 |

Preset de clase del Piromante (`clsPreset`, en orden): c1 2 · c3 2 · c2 2 · c4 3 · c5 B · c6 2 · c8 2 · c7 2 · c10 3 · c9 2 · c13 2 · c12 A · c11 2 · c14 · c15.

### 4.4 Árbol del Piromante, rehecho (21 nodos; mismas puertas: 6 → fila 4, 12 → fila 7, ápice 17 puntos y Nv40)

| id | Fila · col | Nombre (icono) | Tipo · rangos | Efecto por rango | Toca | Implementación | Requiere |
|---|---|---|---|---|---|---|---|
| s0 | 0 · 1,5 | Ignición (s0) | clave gratis | Tus golpes de Fuego queman: 60 % del golpe en 4 s. Lleva además la **pasiva** Bola 350 % | Todo el Fuego | `p_ignicion` (existe; añade `modifyResolve` de la Bola) · **ya no concede Llamarada** | — |
| s1 | 1 · 0,5 | **Brasas** (arte de s3) | pasiva · 2 | La Quemadura dura +1 s | — | `tv.burnDur 1` · existe (era s3) | s0 |
| s2 | 1 · 2,5 | **Mecha Corta** (s2) | pasiva · 2 | Bola de Fuego: −10 % de enfriamiento | Bola | `mod bola_fuego {cdr:10}` · existe (era «Combustión Rápida») | s0 |
| s3 | 2 · 0 | **Llama Persistente** (arte de s11) | pasiva · 2 | +8 % de daño de Quemadura | — | `tv.burnPct 8` · existe (era s11) | s1 |
| s4 | 2 · 1,5 | Llamarada Avivada (s4) | pasiva · 1 | Llamarada detona el 100 % y da 25 de Calor | Llamarada | `p_llamarada_avivada` · existe | s1 o s2 |
| s5 | 2 · 3 | Calor Abrasador (s5) | pasiva · 3 | +4 % de crítico contra enemigos en llamas | — | `tv.burningCrit 4` · existe | s2 |
| s6 | 3 · 0,5 | Propagación o **Brasa Profunda** (s6) | elección | A: si muere en llamas, la Quemadura salta a 2 cercanos · B: la Quemadura se acumula ×3 | — | `p_propagacion` / `p_acumular` · existen (B era «Concentración») | s3 o s4 |
| s7 | 3 · 2,5 | Pira (s7) | pasiva · 2 | Meteoro deja un charco de fuego 0,4 s | Meteoro | `mod meteoro {zone, zoneDur:.4}` · existe | s4 o s5 |
| s8 | 4 · 0 | Fuego Interior (s8) | pasiva · 2 | Matar a uno en llamas te cura un 2 % | — | `tv.burnKillHeal 2` · existe | s6 |
| s9 | 4 · 1,5 | **Combustión** (s9) | **clave** · 1 | **Al gastar Ignición Total: 3 s en los que tu Fuego es siempre crítico** | Bola · Meteoro | `p_combustion` (existe) + **`afterCast` nuevo** en el mismo poder: si `cast.prof.ignition` (lanzamiento con Ignición Total), `addBuff('p_combustion', 3 s)`. **Ya no es activa** | s6 o s7 |
| s10 | 4 · 3 | Ceniza Ardiente (s10) | pasiva · 2 | +10 % de daño de Meteoro y Supernova | Meteoro · Supernova | existe | s7 |
| s11 | 5 · 0,5 | **Combustible** (arte de s15) | pasiva · 2 | +3 de maná por enemigo en llamas que muere | — | `tv.burnKillMana 3` · existe (era s15) | s8 o s9 |
| s12 | 5 · 2,5 | Pirotecnia (s12) | pasiva · 2 | Cada crítico: −0,5 s a los enfriamientos de Fuego | Todo el Fuego | `tv.critFireCdr` · existe | s9 o s10 |
| s13 | 6 · 0 | Fénix o **Escudo de Llamas** (s13) | elección | A: al morir renaces con 50 % (cada 2 min) · B: quien te golpea cuerpo a cuerpo arde (100 % del golpe medio en 4 s) y −5 % de daño recibido | — | A `p_fenix` (existe) · B `p_escudo_llamas` **nuevo** (④ `onDamaged` → `ignite`) + `tv.dmgReduc 5`. Muro de Fuego pasa a la forja | s11 |
| s14 | 6 · 1,5 | Conflagración (s14) | clave · 1 | Al matar: explosión del 270 % | — | `m_conflag` · existe | s11 o s12 |
| s15 | 6 · 3 | **Rastro Avivado** (arte de s1) | pasiva · 2 | Estela Ígnea: +50 % de daño y −1 s de enfriamiento | Estela | `mod m_estela_ignea {dmg:50, cdr:10}` · claves existentes | s12 |
| s16 | 7 · 0,7 | Supernova Abrasadora (s16) | pasiva · 2 | Supernova: Quemadura +30 % | Supernova | `tv.supernovaBurn` · existe | s13 o s14 |
| s17 | 7 · 2,3 | Ola de Calor (s17) | pasiva · 2 | +20 % de radio de tu Fuego | Todo el Fuego | `mod @fire {radius:20}` · existe | s14 o s15 |
| x1 | 8 · 0,5 | Corazón del Sol (x1) | ápice · 1 | Una Quemadura que termina explota con el 30 % | — | `p_corazon_sol` · existe | s16 o s17 |
| x2 | 8 · 1,5 | Sol Naciente (x2) | ápice · 2 | +5 % de daño de Fuego contra los que ya estallaron | — | `tv.explodedDmg` · existe | x1 |
| x3 | 8 · 2,5 | Nova Solar (x3) | ápice · 1 | Cada 20 explosiones, Supernova sola y gratis | Supernova | `p_nova_solar` · existe | x2 |

- Rangos máximos: 35 para 21 puntos (+3 por hazañas).
- Preset (en orden): s2 2 · s4 · s1 2 · s5 3 · s3 2 · s7 2 · s6 A · s9 · s10 2 · s12 2 · s14 · s11 2 · s17 2 · s16 2 · x1 · x2 2 · x3.
- **Ningún nodo** concede activas, cambia la forma de una habilidad ni nombra una habilidad de otra especialización o del kit base no ígneo.

### 4.5 Lista exacta de cambios por archivo (Maga; Crionte y Arcanista en su etapa)

**`js/skills-maga.js`**
- **Añadir**:
  - `m_parpadeo` (movilidad, Nv4; usa el tipo genérico `blink`) y `m_barrera` (defensa, Nv6; comportamiento `m_barrera`). Son los datos de `m_t_parpadeo`/`m_t_barrera` sin `kind:'talent'`.
  - `p_llamarada` (Nv10, `spec:'piromante'`), movida desde `MAGA_TALENT_SKILLS`.
- **Cambiar**:
  - `bola_fuego.splash` 3,5 → 1,0;
  - `nova_hielo.req` 14 → 8;
  - `spec:'piromante'` en `meteoro`, `m_estela_ignea` y `m_u_supernova`.
- **Quitar**: `m_ascua`, `m_toque`, `m_armadura` y `m_onda`. Su comportamiento `m_onda` pasa a la forja como `v_parpadeo_onda`.
- **Forja**: `MAGA_SKILL_FORGE` según §4.2. Sustituye a `MAGA_SKILL_MODS`. `LEGACY_FORGE_MAP` gana las entradas de §6.
- **Provisional** hasta la etapa Crionte/Arcanista: `rayo`, `m_paso_escarcha` y `m_u_tormenta`/`m_u_desgarro` llevan `spec:'arcanista'`/`'crionte'`.

**`js/talents-maga.js`**
- `cls.nodes` y `piromante.nodes` según §4.3/§4.4. Se conservan los ids de nodo y cambia el contenido.
- Fuera los `grant` de c2, c3, c5A, c12, s0, s9 y s13B.
- `MAGA_TALENT_SKILLS` pierde Barrera, Parpadeo, Contrahechizo, Inversión, Bloque, Llamarada, Combustión y Muro de Fuego. Las de Crionte y Arcanista quedan hasta su etapa.
- Piromante: nuevos `preset`, `clsPreset` y `recoVariants`.
- Se elimina c9 `skillLv:'@spec'`.

**`js/powers-maga.js`**
- **Nuevos**: `m_disrupcion`, `m_bloque_auto`, `m_escudo_mana`, `p_escudo_llamas` y los de forja `v_reactiva`, `v_coraza_arcana`, `v_parpadeo_onda` (comportamiento).
- **Cambian**:
  - `p_ignicion` gana `modifyResolve`: la Bola recibe +2,5 de salpicadura con Piromante;
  - los comportamientos `m_t_barrera` → `m_barrera` y `m_t_parpadeo` (genérico) → `m_parpadeo`.
- **Se quitan**: los comportamientos `m_t_contrahechizo` (su lógica pasa a `m_disrupcion`), `m_t_inversion` (con `recordRewind`), `m_t_bloque` (lo reutiliza `m_bloque_auto`), `p_combustion` (el **comportamiento** de la activa; el **poder** se queda) y `p_muro_fuego` (comportamiento; el **campo** se queda para Muro de Llamas).

**Fuera de la Maga** (núcleo, mínimo):
- `js/spec-mechanics.js`: **no cambia**. Combustión se dispara en un `afterCast` del propio poder `p_combustion` (`powers-maga.js`), que lee `cast.prof.ignition`, la marca que ya pone el Calor al resolver con Ignición Total. Respeta `test67`.
- `js/powers-common.js` / núcleo: clave `dartCritCdr` en `nucleo_tv` (6 líneas).
- `js/skill-defs.js`: `spec` en `normalizeSkillDef` y `validateSkillDef`, que comprueba que el id exista en `TALENT_TREES`.
- `js/skill-resolve.js`: `isKnown` exige `activeSpec(p)?.id === sk.spec`.
- `js/hud-model.js`: `bookSections(p)` y `specSwapBar(prev, next)`, los dos puros.
- `js/talents.js`: `validate` falla si un nodo de la Maga tiene `grant` (las otras clases quedan exentas hasta su rework).

---

## 5. Esbozo: Crionte y Arcanista (se detallan tras aprobar el Piromante)

| | Crionte (control) | Arcanista (un objetivo) |
|---|---|---|
| **Kit en el libro** | Prisión de Hielo (insignia `3`, Nv10) · Paso de Escarcha (`1`, Nv12) · Lanza de Hielo (`DER/2`, Nv14) · Tormenta Glacial (`4`, Nv15) | Orbe Arcano (insignia `3`, Nv10) · Sello del Archimago (utilidad `2`, Nv12) · Rayo (`DER/2`, Nv14) · Desgarro Arcano (`4`, Nv15). Su movilidad es Parpadeo, del kit base |
| **Habilidad base de su elemento** | Nova de Hielo (su árbol la potencia: s2, s11 y s16) | Dardo Arcano (genera Cargas por s0; el árbol de clase también lo toca, pero con efectos distintos) |
| **Pasiva de la especialización** | +25 % de stagger (ya existe) | El Dardo genera Cargas Arcanas (hoy está en s0) |
| **Recomendado** | Dardo **II** (Saeta Gélida) | Dardo sin variante (Saeta Ígnea apagaría las Cargas) |
| **Sale** | Ventisca (repite Ventisca Anclada) · Aliento Boreal · Toque Gélido · Armadura de Hielo · Carámbanos (s7, que repite Saeta Gélida) · Témpano (s6B, que cambia la forma de la Nova → candidata a variante) | Misiles Arcanos (repite Haz Concentrado) · Evocación · Arco Voltaico (s6B) y Sobretensión (s15), que cambian la forma del Dardo · Piel de Maná (pasa a clase) |
| **Nombres que se renombran** | — | Variante «Singularidad» de Desgarro → «Quiebre» (el ápice x3 conserva el nombre) |
| **Riesgo de balance** | Pierde c9 Conducto Elemental (+2 niveles de hielo) y Toque Gélido (control en cono). Hay que vigilar CONTROL ≥ 50 % / 20 % | Pierde Misiles en `2`. La ofensiva pasa a Rayo + Orbe, y la variante Haz Concentrado debe cubrir el +12–25 % de la ranura `2` |

---

## 6. Migración de guardados

Va en **`MIGRATIONS[5]` (v5 → v6)** si 2f (v4 → v5) llega antes. Si 2f y 2g se implementan juntos, es **una sola migración v4 → v5** con los pasos de 2f y luego los de aquí. Es idempotente y trabaja sobre una copia.

1. **Talentos de clase** (`talents.cls`):
   - se conservan los rangos de c1, c4, c6, c8, c10, c11, c13, c14 y c15 (mismo efecto);
   - se **liberan** c2, c3, c5, c7, c9 y c12, con su `choice`, porque su efecto cambió.
   - Los puntos se calculan por nivel, así que liberar no pierde nada.
2. **Talentos del Piromante** (`talents.sp.piromante`):
   - se conservan s2, s4, s5, s6 (con su elección), s7, s8, s9 (mismo nombre, ahora pasiva), s10, s12, s14, s16, s17 y x1–x3, y s13 si eligió A (Fénix);
   - se liberan s1, s3, s11, s15 y s13-B.
   - Luego pasa `validRanks`: quita desde abajo lo que se quede sin requisito o sin puerta.
3. **Barra** (`hotbar`), en este orden y sin duplicados:
   - `m_t_parpadeo` → `m_parpadeo`;
   - `m_t_barrera`, `m_armadura`, `m_onda`, `m_t_contrahechizo`, `m_t_inversion` y `m_t_bloque` → `m_barrera` (si ya estaba, la ranura queda vacía);
   - `m_ascua` y `m_toque` → `m_dardo`;
   - `p_combustion` → `p_llamarada`;
   - `p_muro_fuego` → `m_barrera` (en `2`) o `p_llamarada` (en `3`).
   - Lo que exige otra especialización (`meteoro`, `m_estela_ignea` y `m_u_supernova` sin Piromante) cae al kit base de su ranura (Bola, Parpadeo) o se vacía (`4`).
   - Con Piromante y Nv ≥ 10: `hotbar.k3 = 'p_llamarada'`; con Nv ≥ 15 y `k4` vacía: `m_u_supernova`.
4. **Forja** (`skillForge`):
   - **Ascua** en `IZQ`, y Dardo sin variante → Dardo `i` (Saeta Ígnea).
   - **Toque Gélido** → Dardo `ii`.
   - **Armadura de Hielo** `i`/`ii` → Barrera `i` (Barrera Gélida) o `ii` (Coraza Arcana).
   - **Onda Repulsora** → sin variante.
   - **Estela Ígnea**: la `ii` de 2f (Fénix) pasa a `null`, porque Muro de Llamas es otra cosa.
   - Las entradas de habilidades borradas se eliminan.
5. **Soportes**: los engarzados en habilidades borradas vuelven a `knownSupports`, con la regla de v3.
6. **Aviso único** (`p.notices.push('maga2g')`): «La Maga se reorganizó: kit base + kit de tu especialización. Los talentos que cambiaron quedaron libres (gratis). Revisa T y N».
7. **Test** `tests/test-save-maga2g.mjs`: partidas de la Maga Nv5, Nv18 y Nv50 de cada especialización, con Ascua/Armadura/Combustión en la barra y talentos viejos. Comprueba:
   - que no quedan ids huérfanos;
   - los puntos correctos;
   - que es idempotente;
   - que una partida de Guerrero o Arquera no cambia.

---

## 7. Banco de balance: impacto y riesgos

El impacto se comprueba con `node tests/balance-bench.mjs --report --seeds 5` y `node tests/forge-bench.mjs --report`. Objetivos de §7.2 de `paso2-diseno.md`: Piromante ÁREA×5 ≥ 1,20·M y UNI ≥ 0,85·M.

| Cambio | Escenario afectado | Sentido esperado | Mitigación o calibración |
|---|---|---|---|
| `LOADOUT_SPEC.piromante`: `IZQ` Dardo **con Saeta Ígnea** (antes Dardo arcano) | UNI y ÁREA×5 | **Sube**: el básico quema, da Calor y salpica | Comprobar «solo básico ≤ 0,6×». Si se pasa, salpicadura 0,3 → 0,2 |
| s9 Combustión pasa a pasiva (3 s por Ignición Total; antes nunca estaba en la barra) | UNI | **Sube** (estimado +5–9 %: Ignición cada ~10 s con 2 golpes de Fuego/s, así que ~30 % del tiempo con crítico seguro) | Calibrar la duración entre 2 y 4 s. Si UNI > 1,10·M para una especialización de ÁREA, se queda en 2 s |
| Bola de Fuego base 3,5 → 1,0 (Piromante = 3,5 por s0) | Piromante: neutro · resto: ÁREA | Neutro en el Piromante. **Baja** el área del Crionte/Arcanista que usara la Bola (no está en su LOADOUT) | Ninguna |
| Nv2–9: Bola al 100 %, Nova en el Nv8, Parpadeo en el Nv4 y Barrera en el Nv6 sin puntos | Paso 1A a nivel bajo (común 0,6–1,5 s, TTD 6–10) | El daño de área en Nv2–7 **baja** y el aguante y el control en Nv4–9 **suben** | Correr el banco de Nv5 y Nv9. Si el común pasa de 1,5 s, la salpicadura base sube a 1,5 |
| `2` defensiva del Piromante: **Barrera de Maná** en lugar de Armadura de Hielo | TTD+ y el intercambio de `2` | Incierto: Barrera = 60 % del maná/20 s; Armadura = 30 % de la vida/12 s | El preset lleva c2 Escudo Prismático (−20 %) y c7 Piel de Maná (−10 %). Exigir ≥ +30 % de TTD+ sobre la ofensiva; si falta, Barrera 20 → 16 s |
| Fuera s1 Llama Viva (+3 % de Fuego) | UNI/ÁREA | Baja −2–3 % | Lo compensa la Combustión pasiva |
| Fuera c9 Conducto Elemental (+2 niveles al elemento) | Crionte (lo usaba en su preset) | Baja el Crionte | Se recalibra en su etapa. El Piromante no lo usaba |
| Piel de Maná pasa a clase | TTD+ de las 3 especializaciones | Sube un poco | Se vigila el suelo del Guardián (TTD+ ≥ 2,0·M sigue siendo suyo) |
| Supernova solo para el Piromante | Definitiva 12–22 % de UNI | Neutro en la definitiva; el denominador sube por Saeta Ígnea y Combustión | Si baja del 12 %, Supernova 4,7 → 5,0 por onda |

**Riesgos.**
1. **Pérdida de variedad en `4`.** Antes había 3 definitivas y ahora 1 con 2 variantes. Mitigación: las variantes de la definitiva son de papel opuesto (ÁREA/UNI).
2. **El kit base se siente pobre a Nv50** si nada lo potencia. Mitigación: el árbol de clase lo toca (c2, c3, c5B y c9), y el Piromante potencia la Bola y la Quemadura de la Saeta Ígnea.
3. **Dependencia de 2f.** Parpadeo y Barrera necesitan forja; Ascua, Toque, Armadura, Onda y Muro solo sobreviven como variantes. 2g **no se implementa sin la E0 de 2f.**
4. **Las otras clases quedan con el modelo viejo** (activas de talento) hasta su rework. Hay que mantener las dos rutas en `talents.js` y en la UI durante un tiempo. Mitigación: la regla «sin `grant`» se valida solo para las clases ya migradas.
5. **Pasiva de especialización «escondida» en s0.** Si alguien mira solo el árbol, no ve que la Bola sube al 350 %. Mitigación: chip en la forja, en el tooltip y en la sección del Piromante (hecho en el mockup).

---

## 8. Criterios de aceptación (comprobables)

| # | Criterio | Cómo se comprueba |
|---|---|---|
| G1 | Ningún nodo de **clase** toca una habilidad con `spec`, ni la Bola de Fuego ni la Nova, ni usa `@spec` | Test `test-maga-coherencia` sobre `nodeFx` |
| G2 | Ningún nodo de la Maga tiene `fx.grant`. Todas sus activas están en `MAGA_SKILLS` | Mismo test |
| G3 | Cada activa de la Maga tiene `spec ∈ {null, 'piromante', 'crionte', 'arcanista'}`. `isKnown` es falso con otra especialización | Test con un héroe de cada especialización a Nv15 |
| G4 | Los nodos del Piromante solo tocan habilidades con `spec:'piromante'`, la `bola_fuego` o `@fire` | Test |
| G5 | Ningún nombre se repite entre habilidades, variantes y nodos de la clase. Ningún `fx.mod` de talento usa claves de forma (`type`, `elem`, `chain`, `pierce`, `charges`, `at`) | Test |
| G6 | Con Nv2/4/6/8 y sin especialización, `defaultSlots` llena `IZQ`/`DER`/`1`/`2` solo con el kit base, y a Nv8 hay al menos una habilidad de fuego, una de hielo y una arcana | Test |
| G7 | Cambiar de especialización y volver deja la misma barra y la misma forja. No quedan ids que exijan otra especialización | Test con `specSwapBar` |
| G8 | Panel de talentos: el nodo **no muestra** descripción (solo icono, nombre ≤ 24 caracteres y rango). El tooltip trae el efecto con números, «habilidades que toca» y el estado. La columna central no tiene párrafos | `?talentscheck=1` (cajas y longitudes de texto) y capturas a 1920 y 1366 contra las del mockup |
| G9 | Banco: matriz del Piromante en verde (ÁREA×5 ≥ 1,20·M, UNI ≥ 0,85·M, definitiva 12–22 %, solo básico ≤ 0,6×, intercambio de `2`) sin empeorar a las demás especializaciones | `balance-bench --seeds 5` |
| G10 | La migración es correcta e idempotente | `test-save-maga2g` |
| G11 | `test67` (sin `powers.has(` fuera de `powers*.js`), `test65a` (prefijo de poder) y `test43-mixins` en verde | `npm test` |

---

## 9. Plan de implementación por etapas

El modelo principal juzga cada ola. Opus implementa y Sonnet hace lo mecánico. Ningún archivo lo tocan dos trabajadores a la vez.

| Etapa | Quién | Archivos (propiedad exclusiva) | Entrega |
|---|---|---|---|
| **E0 · Diseño restante** (sin código) | Modelo principal + 1 Opus | `docs/` | Crionte y Arcanista con el formato de §4. Aprobación del dueño de **los tres** antes de tocar código: así no queda una Maga a medias en `main` |
| **E1 · Núcleo** (tras la E0 de 2f) | 1 Opus | `js/skill-defs.js` (`spec`), `js/skill-resolve.js` (`isKnown`), `js/hud-model.js` (`bookSections`, `specSwapBar`), `js/talents.js` (validación sin `grant` por clase), `js/save-schema.js` (v6), tests G3/G6/G7 | Las otras clases sin cambios. Tests en verde |
| **E2 · Datos de la Maga** | 1 Opus | `js/skills-maga.js`, `js/talents-maga.js`, `js/powers-maga.js`, `js/fx-skills-maga.js`, `tests/test-powers-maga.mjs`, `tests/test-maga-coherencia.mjs` | §4.5 completo (las 3 especializaciones). G1–G5 en verde |
| **E3 · Banco** (en paralelo con E4) | 1 Opus | `tests/balance-bench.mjs` (`LOADOUT_SPEC` de la Maga, Saeta Ígnea en `IZQ`, Barrera en `2`), y los números de `skills-maga.js`/`talents-maga.js` tras E2 | G9 con el informe antes/después |
| **E4 · Interfaz** | 1 Opus | `js/ui-skills.js` (libro por origen, sobre la E2 de 2f), `js/ui-talents.js` (modo «libro»: nodo = icono + nombre + rango, tooltip rico, «Recomendado ahora», ilumina por habilidad), `css/talents.css` y `css/skills.css` | G8. El modo nuevo queda tras `classUsesBookTalents(cls)` hasta migrar las otras clases |
| **E5 · Migración y cierre** | 1 Sonnet + juicio | `js/save-schema.js` (pasos de §6), `tests/test-save-maga2g.mjs`, `MEMORIA.md` (Paso 2g ✅), `CLAUDE.md` (mapa), `sw.js` (`VERSION`) | G10 y G11, `npm test` en verde, push a las 2 ramas |

**Después:** se aplica el mismo patrón al Guerrero y a la Arquera (2g.2): auditoría, kit base, kits de especialización y árboles. El panel de talentos en modo libro ya estará hecho.

---

## 10. Mockup y refutaciones

### 10.1 Uso

- Se abre `docs/mockups/skills-ux.html` con la clase **Maga** (por defecto).
- **Parámetros nuevos:**
  - `&lvl=5|18|50`: también hay un selector de nivel en la barra de control;
  - `&view=talents`;
  - `&chooser=1`: selector de especialización;
  - `&tipnode=cls:c9|spec:s4`;
  - `&tipskill=<id>`;
  - `&alt=1`.
- La barra de Calor es el **widget real** (`js/ui-gauges.js`), exportado del bundle como `TP.createGauge`.
- Guerrero y Arquera quedan como estaban, con la cinta «Pendiente de rehacer».
- Capturas en `C:\Users\juanm\AppData\Local\Temp\claude\D--Proyectos-IntentoRPG\6ead5cf3-f7a8-4c53-8c4f-4d18d352840c\scratchpad\maga-coherencia\`. Finales:

| Captura | Muestra |
|---|---|
| `final_libro_18_1920.png` | Libro Nv18: kit base (5), Piromante (4) con chips de mecánica y pasiva, Crionte y Arcanista bloqueadas con emblema. Tooltip de la Bola con «Piromante: explosión 100 → 350 %» y los talentos que la tocan |
| `final_libro_05_1366.png` | Maga Nv5 sin especialización: kit base 3/5, «Especialización · eliges una al nivel 10» con 3 filas y la barra con `2`/`3`/`4` cerradas. Tooltip de Llamarada bloqueada |
| `final_tal_18_1920.png` | Talentos Nv18: dos árboles con nodos de icono, nombre y rango, Calor real y «Qué mejora cada árbol». Tooltip de Combustión |
| `final_tal_hl_1366.png` | Al pasar por la Bola de Fuego se iluminan sus 5 nodos del Piromante y el árbol de clase queda apagado entero: la prueba visual de las capas |
| `final_tal_50_alt_1920.png` | Nv50 con `Alt`: tooltip de la elección c12 con las dos opciones y el detalle técnico (poder nuevo o existente) |
| `final_spec_05_1920.png` · `final_spec_18_1366.png` | Selector: cada especialización enseña su kit en el libro, su mecánica y su pasiva. Crionte y Arcanista marcadas «Esbozo» |

### 10.2 Refutaciones (tres rondas, críticas como el dueño)

**Ronda 1** (`r1_*.png`).

| Crítica | Cambio |
|---|---|
| Las etiquetas de las puertas («6 PUNTOS · 4/6») se montaban sobre los nombres de los nodos | Ahora son una píldora corta a la izquierda («🔒 6» / «✓ 6») y el ápice va a la derecha. El texto completo sale en el tooltip de la píldora |
| A 1366, «Supernova Abrasadora» y «Ola de Calor» se tocaban | Columnas 0,7 y 2,3 en la fila 7 |
| El tooltip salía a medio fundido en la captura | Sin transición en modo captura y sin retardo |
| El kit del Piromante se ordenaba por categoría: Meteoro primero y la insignia tercera | Orden por nivel (Llamarada 10 → Estela 12 → Meteoro 14 → Supernova 15): cuenta la progresión |

**Ronda 2** (`r2_*.png`).

| Crítica | Cambio |
|---|---|
| (Bloqueante) Las líneas de estado de los tooltips («Se aprende al nivel 10…», «Sin puntos libres…») salían **una palabra por línea**. La clase `.lk` del icono enlazado chocaba con el estado «bloqueado» | Icono enlazado renombrado a `.skl` |
| **La columna central repetía el tooltip** (inspector y tooltip decían lo mismo): dos veces el mismo texto | La columna central pasa a «**Recomendado ahora**»: el siguiente nodo de la build con un botón Aprender, o «Próximo punto: nivel N». El detalle de cualquier nodo va solo en su tooltip |
| La etiqueta interna del widget de Calor medía menos de 10 px a 1366 | Se oculta: la columna ya dice «Mecánica · Calor» |
| «¿Qué toca cada árbol?» no se demostraba: el resaltado apuntaba a la casilla oculta del libro | El resaltado usa el icono de la columna central. Con la Bola, el árbol de clase queda **apagado entero** |

**Ronda 3** (`r3_*.png`): la tercera se usó porque la segunda encontró problemas reales.
- La capa queda legible a 1366.
- El resaltado de la Bola enciende Ignición, Mecha Corta, Combustión, Pirotecnia y Ola de Calor, y nada del árbol de clase.
- Los tooltips de elección enseñan A y B en una línea cada uno. Sin párrafos.
- Quedan sin resolver, por menores:
  - la columna central deja aire libre cuando no hay puntos;
  - el subtítulo de la cabecera de talentos es largo (una línea).

---

## 11. Preguntas para el dueño (antes de E0)

1. ¿Una definitiva por especialización (con 2 variantes) o se mantienen las 3 «eliges una»? La propuesta es **una**, por coherencia.
2. ¿El básico es siempre el Dardo, con Saeta Ígnea o Gélida como variantes (propuesta), o cada especialización tiene su básico propio, como Ascua para el Piromante? Lo segundo da más casillas, pero repite el papel de la variante.
3. Combustión: ¿pasiva ligada al Calor (propuesta, siempre trabaja) o activa en la ranura `2` como «ráfaga ofensiva», a cambio de la segunda gastadora?
4. ¿Se aplica el panel de talentos en modo libro a todas las clases a la vez (E4), aunque su contenido siga siendo el viejo hasta 2g.2?
