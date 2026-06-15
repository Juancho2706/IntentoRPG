# ESTUDIO — Clases, habilidades, pasivos, soportes y progresión (Junio 2026)

> Auditoría + propuestas para **variedad de builds**. Lee los datos reales del repo y
> cruza referencias de **D2 / D3 / D4 / Path of Exile / Last Epoch**. NO implementa:
> es el plano para decidir qué construir y en qué orden.

Referencias 2026 (claves que aplico):
- **D2**: sinergias entre habilidades + *hard points*; la diversidad nace de invertir y de las sinergias.
- **D4**: árbol de skills con **pasivas que modifican familias**, **Paragon boards** temáticos + **aspectos** (cambian comportamiento).
- **PoE / PoE2**: **gemas de soporte robustas** socketadas a la habilidad (no al equipo), combinatoria enorme, rara vez bloquea combos raros.
- **Last Epoch**: **árbol de talentos POR habilidad** (cada skill se reconfigura sola); determinista, premia experimentar.

---

## 1. Estado actual (auditado del código)

### Clases y skills (`data.js`)
- **3 clases** (Guerrero/Maga/Arquera), **6 skills** cada una en 3 *tiers* (`TIER_LEVELS=[1,6,12]`), **máx 5 puntos/skill**.
- **1 sola pasiva por clase** (la skill de tier 3 `type:'passive'`): Maestría de Combate / Arcana / Puntería.
- **Sinergias** (`synergyBonus`): existen pero **escasas y lineales** — solo ~4 skills por clase tienen **1** sinergia (`+5%/punto`), y son **solo +daño**. No hay sinergias defensivas, de utilidad ni cruzadas múltiples.

### Soportes de habilidad (`SUPPORTS`, 12)
- Se engarzan **hasta 2 por skill** activa; filtrados por `types`.
- Efectos **planos** (no escalan con nivel ni con un "rango" del soporte): `+30% daño`, `+2 proyectiles`, `atraviesa`, `+45% radio`, `ralentiza`, `rebota`, `concentrado`, `eco`, `sangrado`, `veneno`, `sangre fría`, `sobrecarga`.
- Solo **un combo explícito** (Gélido → Sangre Fría). Pocos son "transformadores" (multi/chain/pierce); el resto son multiplicadores simples.

### Maestrías (`MASTERIES`, fase 1-2)
- **3 ramas/clase**, **6 nodos** c/u (3 menores +stats, 2 notables, 1 capstone con poder).
- **Problema de economía**: se gana **1 punto de maestría cada 2 niveles desde el 12** (`gainXP`) → por el nivel ~22 ya llenaste los 6 nodos de tu rama; **el resto de puntos se desperdician** (solo hay 6 huecos y una rama activa).
- Nodos sobre todo **+stats**; pocos transforman skills (fase 3 pendiente).

### Paragon (`PARAGON_BOARD`, 9×9)
- Tablero **genérico** (4 brazos: ofensiva/sustento/defensa/velocidad) **igual para todas las clases**, +4 engarces de glifo. Nodos legendarios dan poderes.
- No hay identidad de clase ni de arquetipo en el tablero.

### Economía de puntos (`entities.js gainXP`)
- **Nivel 1–20**: +5 atributos y **+1 punto de habilidad** por nivel (empiezas con 1) → ~**20 puntos de skill** para **30 de capacidad** (6×5). Bien: **obliga a especializar**.
- **Nivel 21+**: +1 punto **Paragon** por nivel (las skills dejan de crecer → quedan "congeladas" en lo invertido).
- **Nivel 12+ (pares)**: +1 punto de **maestría** (ver problema arriba).

### Diagnóstico (resumen)
| Área | Problema | Gravedad |
|---|---|---|
| Sinergias | Escasas, lineales, solo +daño | Alta |
| Pasivas | Solo 1 por clase; no ramifican familias | **Alta** |
| Soportes | Planos, no escalan, pocos combos/transformaciones | **Alta** |
| Maestrías | Exceso de puntos vs nodos; pocos transforman | Media |
| Paragon | Genérico, sin identidad de clase/arquetipo | Media |
| Skills | Sin sub‑personalización por habilidad | Media |
| Economía | Skills se congelan en nivel 20; mastery points sobran | Media |

**Conclusión**: hay buenos cimientos (sinergias, soportes, maestrías, paragon, glifos) pero **poco profundos**. La variedad de build se agota rápido porque cada capa ofrece pocas decisiones reales. Las tres palancas de mayor impacto son **pasivas ramificadas**, **soportes robustos** y **más/ mejores sinergias**.

---

## 2. Arquetipos objetivo (la brújula del diseño)

Para garantizar variedad, cada clase debe soportar **≥3 arquetipos** viables y distintos (ya alineados con las maestrías existentes):

- **Guerrero**: *Berserker* (furia, vida baja, robo de vida) · *Guardián* (tanque, espinas, reflejo) · *Cruzado* (sagrado, auras, área al matar).
- **Maga**: *Piromante* (ignición/DoT que se propaga) · *Crionte* (control: congelar→astillar) · *Arcanista* (crítico, maná, cadenas).
- **Arquera**: *Francotiradora* (golpe único enorme, crítico) · *Montaraz* (trampas/terreno, ralentizar) · *Tiradora* (cadencia, multiproyectil).

Cada propuesta de abajo debe **empujar** hacia uno de estos carriles.

---

## 3. Propuestas por capa (con prioridad)

### 3.1 Pasivas ramificadas — **[Prioridad ALTA]**
Hoy: 1 pasiva/clase. Objetivo: un **set de pasivas por clase** que potencien **familias** de skills y arquetipos. Dos vías combinables:

- **A) Expandir las MAESTRÍAS** como el "árbol de pasivas" (lo más limpio, ya existe el sistema):
  - Subir de **6 → 10‑12 nodos** por rama, con **2 sub‑carriles** internos (p. ej. Piromante: "propagación" vs "estallido"), y *gates* por puntos.
  - Nodos que **modifican familias**: "+X% daño a habilidades de fuego", "tus AoE aplican quemadura", "tus proyectiles que perforan ganan +daño por enemigo".
  - Esto **absorbe** los puntos de maestría sobrantes (arregla la economía) y da identidad real.
- **B) Sinergias 2.0** (estilo D2, barato): añadir **2‑3 sinergias por skill**, no solo +daño:
  - +radio/+duración/+proyectiles/−coste/+crítico por puntos en skills hermanas.
  - Sinergias **defensivas** (p. ej. puntos en Armadura Helada → +absorción) y de **utilidad**.
  - Mostrarlas mejor en la UI (ya hay panel de sinergia).

### 3.2 Soportes 3.0 (robustez) — **[Prioridad ALTA]**
Hoy: 12 planos, 2 slots, sin escalado. Objetivo: que **transformen** y **escalen**.

- **Rango de soporte**: cada soporte tiene **nivel** (encontrado como botín o subido con material). `effect` escala con rango (p. ej. Amplificado +20/30/40% daño).
- **3 slots** en habilidades de tier alto (o un slot extra desbloqueado por maestría).
- **Nuevos arquetipos de soporte**:
  - **Conversión elemental**: "tu daño se vuelve fuego/hielo/rayo" (abre cruces con pasivas elementales).
  - **DoT que escala**: sangrado/veneno con daño basado en % del golpe y que **se acumula**.
  - **Condicionales**: "+X% vs jefes", "+X% si el objetivo está lleno de vida", "+X% al primer golpe".
  - **Meta**: −cooldown, +duración de buff, "la habilidad no cuesta maná pero cuesta vida".
  - **Invocación/eco mejorado**: deja una torreta/rastro que repite.
- **Combos explícitos** (como Gélido→Sangre Fría): documentar y añadir 4‑6 pares (Veneno+Concentrado, Conversión Fuego+pasiva Piromante, etc.). La UI ya marca contrapartidas; añadir un aviso de **"combo activo"**.

### 3.3 Paragon temático — **[Prioridad MEDIA]**
- Un **brazo/tablero extra por arquetipo** o tintar los nodos por clase (p. ej. el brazo ofensivo de la Maga ofrece "daño elemental" en vez de genérico).
- Más **engarces de glifo** y glifos con efectos de familia (no solo +stat).
- Mantener el tablero compartido pero añadir **2‑3 nodos legendarios por clase** distintos.

### 3.4 Sub‑personalización por skill (Last Epoch‑lite) — **[Prioridad MEDIA/larga]**
- Por cada skill, **3‑4 "mejoras" elegibles** (1 punto cada una, excluyentes por pares): p. ej. Bola de Fuego → {explota en área | +proyectil | deja charco | atraviesa}. Es el sistema de más profundidad pero el más caro; podría montarse **encima de los soportes** (soportes "innatos" de cada skill).

### 3.5 Economía de puntos — **[Prioridad MEDIA]**
- **Maestría**: pasar a **1 punto cada 3 niveles** (o subir nodos a 10‑12) para que no sobren.
- **Skills tras nivel 20**: o bien siguen ganando 1 punto cada N niveles (para acercarse al máximo), o se introduce un material que sube el cap/da puntos. Evita que el build "se congele".
- Considerar **puntos de especialización** separados para la sub‑personalización por skill (3.4).

---

## 4. Plan por fases (impacto / esfuerzo / riesgo)

| Fase | Qué | Impacto | Esfuerzo | Riesgo |
|---|---|---|---|---|
| **1** | **Sinergias 2.0** (2‑3 por skill, no solo daño) + mostrarlas | Alto | Bajo‑Medio | Bajo (data + recompute) |
| **2** | **Soportes 3.0**: rango/escalado + 5‑6 soportes nuevos (conversión, DoT escalable, condicionales) + combos | **Muy alto** | Medio | Medio (cast + items) |
| **3** | **Maestrías a 10‑12 nodos** con sub‑carriles + pasivas de familia; reajustar economía de puntos | **Muy alto** | Medio‑Alto | Medio |
| **4** | **Paragon temático** por clase + glifos de familia | Medio | Medio | Bajo |
| **5** | **Sub‑personalización por skill** (Last Epoch‑lite) | Muy alto | Alto | Medio‑Alto |

**Recomendación de arranque**: **Fase 1 (sinergias 2.0)** por ser barata y notarse ya, en paralelo con el diseño de **Fase 2 (soportes 3.0)** que es la que más variedad desbloquea. La Fase 3 (maestrías profundas) es el siguiente gran salto y de paso arregla la economía de puntos de maestría.

---

## 5. Notas de implementación (para cuando toque)
- Todo **data‑driven** en `data.js`; los efectos se aplican en `Player.recompute()` (stats/powers) y en el *cast* (`castSkillSlot`/`dealArea`/proyectiles), igual que hoy los soportes.
- Nuevos comportamientos → un `power` en el nodo/soporte y cablearlo en el hook adecuado (patrón ya usado por maestrías y legendarios).
- Mantener `npm test` en verde; ampliar `test26-soportes`, `test45-maestrias`, `test21-clases` con la nueva variedad.
- Rebalancear con las suites de equilibrio (`test38-equilibrio-endgame`) tras cada fase.

*Fin del estudio.*
