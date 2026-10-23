# Clasificación de las 170 objeciones media/baja y faltantes (diseño v4.2)

Fuente: `pendientes-media-baja.md`. Documento: `paso4-items-diseno.md` v4.2. Cada id aparece una sola vez. Gravedad: m = media, b = baja, f = faltante.

## Conteos

| Estado | N |
|---|---|
| RESUELTA | 84 |
| ETAPA | 57 |
| DESCARTAR | 15 |
| REVISAR | 14 |
| **Total** | **170** |

ETAPA por etapa: E0 2 · E1 14 · E1.5 1 · E2 9 · E2b 2 · E3 11 · E4 16 · E4b 1 · E5 1.

## REVISAR (14: decisión del dueño, números o contratos, o posible gravedad mayor)

| Id | Razón |
|---|---|
| INV-A-P16 | Reabre P4-D2 (`ILVL_MAX` 47, aprobada): propone techo con «pistas de mejora» y saltos del 10–15 %. |
| INV-A-F1 | Perfiles de stats con nombre al estilo GW2: cambia el diseño de pools y líneas. |
| INV-A-F7 | Armería/presets de equipo por especialización: alcance nuevo que el diseño no tiene (igual que R1-A-P19 y R1-A-F11). |
| INV-B-P16 | Limitar a un solo afijo reforjable por pieza cambia la regla de la Herrería (§4.9) y su economía. |
| R1-A-P17 | `aspdPct` solo acelera el básico: línea casi muerta en especializaciones de gastadora o carga y presente en arma, guantes y carcaj. Cambia el contrato de la línea o su valoración. |
| R1-A-P19 | Ver INV-A-F7 (Armería). |
| R1-A-F11 | Ver INV-A-F7 (Armería). |
| R1-B-P7 | Reabre P4-D4 (aprobada): la mejora sube +19 % las líneas % (joyería) frente a +37 % lo plano; propone `1,065^rango` para todo. |
| R1-B-P20 | El ◆ efectivo en solitario (`mín(ilvl, ilvlNivel+2) + rango`) da +7 ◆ a un alt: trivializa la nivelación. Cambia P4-D16 (aprobada). |
| R1-B-F7 | Aspectos no grabables o ligados a Únicos: contradice la decisión v4.2 de Grabar (§4.11, §14 A) y la mitigación de R22. |
| R2-A-P16 | Dos o más Míticos por especialización para evitar el BiS único: duplica contenido (R7) y cambia §4.7. |
| R2-A-P17 | El regalo en dos fases con vuelta a los 30 s puede **duplicar** objetos (§8). Posiblemente más grave que «media»; toca el contrato del Paso 6. |
| R2-A-F8 | «Prueba de botín» `o: { run, netId, idx }` choca con la decisión INV-B-2/R19 (`origen` solo informativo) y cambia el formato §9.1. |
| R2-B-F2 | Regla de regalo «solo lo que no es mejora para ti»: decisión de producto sobre el contrato de regalo. |

## ETAPA

### E0 (contratos y documentación)

| Id | Grav. | Qué hacer |
|---|---|---|
| R2-A-P22 | b | Al pasar a `docs/paso4-items.md`: Last Epoch apagó el comercio en abr-2024 (no 2025), T15 de D4 desde el 15-sep-2026, el Joyero da un Mítico al azar, y quitar o marcar la cita del hallazgo mágico. |
| R2-A-F7 | f | Escribir en E0.1 la tabla de contratos con el Paso 6: alcance de la sincronización, clave de reino, uids y CRC `cat` del saludo con bases, pools, aspectos y constantes. |

### E1 (motores)

| Id | Grav. | Qué hacer |
|---|---|---|
| R1-A-P15 | m | W2: definir el escenario del Daño (jefe de 1 objetivo y manada de 5, 40/60 de partida) y usar los mismos en F10. |
| R1-B-P13 | m | W1: el Mítico se mejora como una pieza, solo 1 activo; fijar si admite ★ (recomendado: no; sus líneas ya van al paso 5). |
| R1-B-F12 | f | Igual que R1-B-P13: documentar las reglas del Mítico en `validateItem`/`validateLoadout`. |
| R2-B-P17 | b | Aclarar `validateItem`: Mítico con ★ o sin ella. Corregir la cita de pesos WoW y la fecha de T15. |
| R1-B-P21 | b | Añadir `cv` (versión de catálogo) al formato compacto, junto a `sv`. |
| R1-B-F15 | f | Igual que R1-B-P21 (`cv`). |
| R2-A-F10 | f | `cv` por objeto; `validateItem` debe tolerar una línea fuera de pool de una versión futura (no perder el objeto). |
| R2-A-P18 | m | W3: pedir `navigator.storage.persist()` al primer escrito del Códice, copia exportable de la cuenta (`IRPGA1`) y aviso si falta el almacén pero hay héroes. |
| R2-A-F9 | f | Igual que R2-A-P18. |
| R2-A-P19 | b | W3: líder con `locks.request(..., {ifAvailable:true})` + cerrojo corto de escritura con `rev`; prueba con cerrojo falso. |
| R2-A-P20 | b | W1: comprobar si `regenPct`/`resGainPct` bastan antes de crear `resRatePct` (§5); corregir la descripción de `resGainPct`. |
| R2-A-F3 | f | W2: contar curas y escudos a aliados y el control en la valoración; sin línea `healPct` nueva. |
| R2-A-F11 | f | Reservar en el formato y en la cuenta un campo para el Talismán futuro (evita una v7). |
| R2-B-F8 | f | W3: reglas Hardcore: el equipo del héroe muerto se pierde y el Códice HC se conserva; unión de Polvo/Chispas al cerrar la temporada. |

### E1.5 (integración)

| Id | Grav. | Qué hacer |
|---|---|---|
| INV-B-F6 | f | `g.giftOffer`: solo se regala lo que cayó sin tocar (`rr = af = sm = 0`, sin gema ni grabado); lo crafteado queda ligado. |

### E2 (contenido)

| Id | Grav. | Qué hacer |
|---|---|---|
| INV-A-P19 | m | Escribir en la cabecera de `aspects.js` la frontera talento/aspecto (el aspecto potencia, no duplica un nodo); test de no-repetición. |
| INV-B-F13 | f | Ola de contenido: primero 2 por especialización + 6 universales; el resto tras el banco. |
| R1-A-P26 | b | Dar a E2 unos 2 días con juicio intermedio. |
| R1-A-F8 | f | Declarar `delta` en cada Único y Mítico y medirlo (F10); el tope numérico lo fija el banco (ver R2-B-P14, R2-B-F9). |
| R2-B-P14 | m | Igual que R1-A-F8; el poder del Mítico exige su especialización y cuenta como el [×] activo (atenuado si no la tienes). |
| R2-B-F9 | f | Igual que R1-A-F8. |
| R1-A-F6 | f | Tabla jefe de zona → aspecto que abre (§4.10), en `aspects-<clase>`. |
| R1-B-P17 | m | `gaugeMax:` es absoluto: los textos «+20 % de Sed máxima» se resuelven a valor; `test-aspects` comprueba que `gaugeMax` cambia con el aspecto puesto. |
| R2-A-F6 | f | Test de apilado aspecto ↔ talento y tope de `gaugeMax:<id>`. |

### E2b (economía)

| Id | Grav. | Qué hacer |
|---|---|---|
| R1-A-P23 | b | Meter la línea y la ranura en el hash de la re-tirada y de la apuesta; guardar justo tras la acción. |
| R1-A-F7 | f | Lo regalado al desguazar da solo oro (sin Polvo ni Códice). |

### E3 (interfaz)

| Id | Grav. | Qué hacer |
|---|---|---|
| INV-B-P13 | m | U4: tabla de prioridad de teclas por contexto en `bindings.js`; Shift (comparar) solo con el cursor sobre un objeto y sin consumir la esquiva; basura/favorito en teclas sin uso en combate. |
| INV-B-F16 | f | Ctrl+C solo exporta (`IRPGI1`); nunca se importa como objeto. |
| R1-A-P16 | m | En Herrería, gemas y filtro llamar «Atributo» a la línea Principal; la categoría de habilidad lleva su icono. |
| R1-B-P16 | m | Igual que R1-A-P16 (la parte de `@insignia` ya está en §4.4). |
| R1-A-P18 | m | Polvo y Chispas como contadores de cuenta, sin pila de 99 (el tope de 1 000 sigue). |
| R2-A-P11 | m | Renombrar el ◇ del objeto («Engaste») frente al «Engarce» de soporte del libro. |
| R2-A-F12 | f | Igual que R2-A-P11; soporte repetido: convertirlo en oro al recogerlo. |
| R2-A-P12 | m | Tabla canónica de glifos en `item-defs.js` con prueba de unicidad (▲ Raro vs ▲ mejora, ★ afijo mayor vs favorito, ✦). |
| R2-B-P12 | m | Igual que R2-A-P12, más forma distinta del Raro y de la mejora (deuteranopía) y esquina fija de cada marca. |
| R2-B-P11 | m | Tooltip del Principal: «+9 Poder»/icono y Alt «solo daño»; quitar el crítico a la Destreza queda en E4b. |
| R2-B-P13 | m | Alt muestra el efecto real de las líneas de daño crítico («≈ +4 % de tu daño»). |

### E4 (banco)

| Id | Grav. | Qué hacer |
|---|---|---|
| INV-A-P17 | m | Declarar las metas «en solitario» y medir el factor de botín por tamaño de grupo en el E10 del Paso 6. |
| INV-A-F9 | f | Igual que INV-A-P17. |
| INV-B-F7 | f | Igual que INV-A-P17 (escalado por grupo antes de calibrar). |
| R2-B-F1 | f | Igual que INV-A-P17. |
| R2-A-F13 | f | Metas de ritmo en T0, T4 y T8+ y en grupo (`loot-bench`). |
| R2-A-P24 | b | IT4 excluye pares con \|Δ\| pequeño o usa semillas pareadas; metas en solitario; Únicos coleccionables en pocas horas. |
| R2-A-P13 | m | Rehacer la tabla de economía en T0/T4/T8+: Chispas por jefe de grieta T8+ (≈ 0,43/h) cambia el «Mítico en ≈ 13 h»; gemas Perfectas frente al techo. |
| R2-B-F7 | f | IT7 vigila también gemas y Chispas sin uso. |
| R2-B-F12 | f | Registro local exportable de botín y monedas por hora para contrastar `loot-bench`. |
| INV-A-P26 | b | El 85 % de aspectos de tu clase es parámetro propio, calibrado en el banco. |
| INV-A-F3 | f | Medir mejoras por hora por fase y el umbral de «se nota» (10–15 %) para el tamaño de los saltos. |
| INV-B-P15 | b | Medir el valor de +1 rango por habilidad y especialización y tasar el afijo. |
| R1-A-P22 | b | Medir en IT0/IT1 si bendiciones y tablero (valores planos) quedan irrelevantes; si sí, escalarlos con G(AL). |
| R1-A-P25 | b | Escribir «cada ~140 monstruos comunes» en O1, §4.11 y `loot-bench`. |
| R1-A-F4 | f | Fijar el % de armas/manos izquierdas de otras clases para el alijo (hoy 100 % propia). |
| R1-B-P19 | b | Los pesos de ranura (0,75/0,5625…) son de partida [S]; los fija el banco. |

### E4b (clases)

| Id | Grav. | Qué hacer |
|---|---|---|
| R2-A-P21 | b | Valorar una base ofensiva de mano izquierda para el Guerrero (Berserker/Cruzado) con IT6 por ranura. |

### E5 (migración)

| Id | Grav. | Qué hacer |
|---|---|---|
| R1-A-F3 | f | M1: Vitalidad → Vida con el `hpPerVit` de cada clase (4 / 3 / 3,5), no ×4 fijo; los puntos por nivel no cambian. |

## RESUELTA (84)

| Id | § |
|---|---|
| INV-A-P18 | §8 Determinismo, §9.1 |
| INV-A-P20 | §10 IT6, IT6b |
| INV-A-P23 | §4.1, P4-D12, P4-D30 |
| INV-A-P24 | §4.13 |
| INV-A-F2 | §1 O6, §10 IT1 |
| INV-A-F4 | §4.10, P4-D14 |
| INV-A-F5 | §4.2, P4-D16 |
| INV-A-F8 | §4.2 |
| INV-A-F10 | §4.13 |
| INV-A-F11 | §9.1, §8 |
| INV-B-P4 | §4.2, §4.8 |
| INV-B-P6 | §4.4, §12.4 |
| INV-B-P7 | §4.1, §4.11, P4-D5 |
| INV-B-P8 | P4-D3, §4.1 |
| INV-B-P9 | §4.1 |
| INV-B-P10 | §4.4 `mainGear`, P4-D5 |
| INV-B-P11 | §4.6 regla 5 |
| INV-B-P12 | §4.8, §7.6 |
| INV-B-P14 | §6 `deriveStats`, §12 E0.3 |
| INV-B-P20 | §4.4, §4.6 |
| INV-B-P21 | §4.3, §7.3 |
| INV-B-F1 | §10 IT7, §12 E4 |
| INV-B-F2 | §10 |
| INV-B-F3 | §9.2, §12 E0.2 |
| INV-B-F4 | §9.1 |
| INV-B-F5 | P4-D16 |
| INV-B-F8 | §4.5, §7.1 |
| INV-B-F9 | §4.7, §4.10, P4-D14 |
| INV-B-F10 | §4.13 |
| INV-B-F11 | §4.6, §12 E0.1 |
| INV-B-F12 | P4-D12 |
| INV-B-F14 | §8 Reinos |
| INV-B-F15 | P4-D11 |
| R1-A-P13 | §4.2 |
| R1-A-P14 | §10 IT0 |
| R1-A-P20 | §9.1 |
| R1-A-P24 | §12 E3 |
| R1-A-F1 | §4.2, §4.9, §4.11 |
| R1-A-F2 | §4.11, §4.13 |
| R1-A-F5 | §4.10, §4.13 |
| R1-A-F9 | §6 |
| R1-A-F10 | §10 |
| R1-A-F12 | §8 `validateItem`, §4.2 |
| R1-B-P8 | §4.6, O3 |
| R1-B-P9 | §4.6 |
| R1-B-P10 | §6 |
| R1-B-P11 | §4.2 |
| R1-B-P12 | P4-D23, §8 |
| R1-B-P14 | §4.2, §4.9, §4.11 |
| R1-B-P15 | §4.4 |
| R1-B-P18 | P4-D1, §10 |
| R1-B-P23 | §0, §7.3 |
| R1-B-F1 | §4.4 IT6 |
| R1-B-F2 | §4.4, §12.4 |
| R1-B-F3 | §4.13 |
| R1-B-F4 | §4.2, §4.11 |
| R1-B-F5 | O3 |
| R1-B-F6 | §4.6 |
| R1-B-F8 | P4-D23 |
| R1-B-F9 | §4.2 |
| R1-B-F10 | §6 |
| R1-B-F11 | §6, IT4 |
| R1-B-F13 | §4.4, §4.6 |
| R1-B-F16 | §10 |
| R2-A-P14 | §4.9 (Afinar) |
| R2-A-P15 | §6 |
| R2-A-P23 | §6 |
| R2-A-F1 | §10 |
| R2-A-F2 | §10, §12 E4 |
| R2-A-F4 | §6, IT3 |
| R2-A-F5 | §4.2 |
| R2-B-P5 | §4.1, P4-D22 |
| R2-B-P6 | §4.4, IT6 |
| R2-B-P7 | §4.4, IT6b |
| R2-B-P8 | §4.4 |
| R2-B-P9 | §4.4 |
| R2-B-P10 | §4.9 |
| R2-B-P15 | §4.13 |
| R2-B-P16 | P4-D30 |
| R2-B-F4 | §4.2 |
| R2-B-F5 | §4.2 |
| R2-B-F6 | §6 |
| R2-B-F10 | §12 E1, E2 |
| R2-B-F11 | §10 IT6b |

## DESCARTAR (15)

| Id | Razón |
|---|---|
| INV-A-P21 | Corrige el informe de investigación; el diseño no afirma el 5.º afijo ni el remate «Mayor». |
| INV-A-P22 | Los conjuntos están retirados (P4-D7). |
| INV-A-P25 | Los charms están retirados (P4-D7); no hay choque de nombres. |
| INV-A-F6 | Marca de agua fuera (P4-D27). |
| INV-A-F12 | Transmog: cooperativo futuro, fuera del Paso 4 (§12.4). |
| INV-B-P5 | Datos de D4 del informe; el diseño ya usa Únicos con 2 fijas + 1 al azar (§4.3). |
| INV-B-P17 | Cita de PD2 del informe de investigación; el diseño no la usa. |
| INV-B-P18 | Fuentes no oficiales del informe; rejilla 1×1 ya decidida (P4-D10). |
| INV-B-P19 | Fuente de Last Epoch del informe; el regalo del diseño es propio y es del Paso 6. |
| INV-B-P22 | Los charms están retirados (P4-D7). |
| R1-A-P21 | El diseño ya no cita a D4 para el hallazgo mágico; la decisión P4-D12 se mantiene. |
| R1-B-P22 | Marca de agua fuera (P4-D27). |
| R1-B-F14 | IT3 limita las líneas a ≤ 60 % de `CAPS` y el sobrecrítico cubre el único tope alcanzable (§4.4, §10). |
| R2-B-P18 | Solo afecta al mockup, que el documento declara desactualizado; E3 captura el juego real. |
| R2-B-F3 | Política de techo para temporadas futuras: decisión de producto posterior; P4-D2 fija 47 hoy. |
