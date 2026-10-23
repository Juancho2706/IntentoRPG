# Clasificación de las 175 objeciones media/baja (diseño Paso 6 v5.2)

Contra `paso6-multijugador-diseno.md` v5.2. Fuente: `pendientes-media-baja.md`. Gravedad de los faltantes: «faltante».

## Conteos
- RESUELTA: 147
- ETAPA: 18
- DESCARTAR: 6
- REVISAR: 4
- Total: 175

## REVISAR (decisión del dueño, números o riesgo mayor)
- **INV-A-F4**: Ladder con build fija (F3, verificación en sombra) deja los ítems fuera del ladder y choca con el roadmap ítems → calibración → ladder; decisión del dueño (D12 aprobó honor → sombra, no esta consecuencia)
- **INV-B-P6**: En F3 el DO pierde la grieta autoritativa al reiniciarse y el límite de CPU por invocación del plan gratis (10 ms) puede invalidar el verificador gratis; medir antes de comprometer F3 (hoy solo «re-simular por tramos» en R2)
- **R1-A-P13**: Respaldo Trystero/Metered: es el conflicto abierto D3 frente a D22 (§14 #13); decisión del dueño
- **R1-B-P17**: Propone vendorizar three@0.160 y quitar cdn.jsdelivr.net de script-src (el diseño §5.3 lo mantiene con integrity); cambia la CSP y el reparto CDN/PWA ya definido

## ETAPA (se atiende al implementar)

### E2
| id | gravedad | qué hacer |
|---|---|---|
| INV-A-P19 | baja | Incluir mech-guerrero.js:231 en el arreglo de sembrar p.combatRng (F0 #3, hoy solo cita powers-maga.js:258); el cron de GitHub no se usa (D11: cron del Worker) |
| INV-B-P19 | baja | Igual que INV-A-P19: sembrar p.combatRng cubre mech-guerrero.js:231; añadir prueba que falle si una tirada de producción cae en el 0,5 fijo |
| R1-A-P17 | baja | Fallback de heroId con crypto.getRandomValues (randomUUID exige contexto seguro; las pruebas por LAN con http fallan) + prueba unitaria |

### E3
| id | gravedad | qué hacer |
|---|---|---|
| INV-A-P20 | baja | Al empezar E3, fijar en una nota el comando grep exacto, rama y commit de cada recuento (player, trascendentes) antes de estimar |

### E4
| id | gravedad | qué hacer |
|---|---|---|
| INV-B-P16 | baja | Marcar sanitizeItem (§2.3) como «a crear» y coordinar con el frente de ítems un validador declarativo junto al catálogo de afijos, reutilizable en regalos, nube y co-op |
| R1-A-F8 | faltante | Añadir Trusted Types en report-only junto a la CSP en report-only (no está en §5.3) |

### E6
| id | gravedad | qué hacer |
|---|---|---|
| INV-B-F5 | faltante | Completar la bienvenida de unión tardía (§3.7) con proyectiles/áreas enemigas en vuelo y banderas de estado/DoT visibles; el resto ya está |
| INV-B-F7 | faltante | Definir qué pasa con campos-sombra, amenaza y DoT del héroe que se desconecta o muere al quitar su RemoteHero tras los 60 s de gracia (§3.7 solo cubre lápida/ausente) |
| R1-A-P19 | baja | El invitado recorta los parámetros de welcome/travel a rangos del catálogo, acepta KILL solo de netId con SPAWN previo y una vez, con tope por segundo (§5.4 solo defiende del invitado) |
| R1-B-F7 | faltante | Añadir a ?netdebug y E10 las métricas que faltan: % de reclamaciones rechazadas por la cota y duplicados reenviados por r (p95 de muerte y % revertidas ya están en §8) |

### E7
| id | gravedad | qué hacer |
|---|---|---|
| INV-A-F5 | faltante | Retención/IP del Worker, DO y TURN: IP con hash y sal rotativa, 3 días de logs, línea en el aviso (F2 ya cubre cuenta, borrado y Ley 21.719 en §4) |
| R1-A-P21 | baja | Igual que INV-A-F5: aviso de privacidad desde F1, IP con hash y retención corta; en F2 ya está en §4 |
| R1-A-F4 | faltante | Añadir al Worker tamaño y ritmo máximos de los mensajes de señalización y máximo de salas por IP (el resto está en §3.8) |
| R1-A-F12 | faltante | Lógica de la sala del Worker como módulo puro probado con node y storage falso dentro de npm test; wrangler/Miniflare solo en E0 y por turno |
| R1-B-P26 | baja | Fijar trystero@0.26.0 y la ruta ESM exacta (vendorizada) y probar getPeers() en R2; depende de la decisión D3/D22 |

### E8
| id | gravedad | qué hacer |
|---|---|---|
| INV-B-F11 | faltante | Añadir criterio de salida medible: telegrafiados siempre encima y tope de partículas por fuente (§2.9/R11 lo describen, ningún criterio lo prueba) |

### F2
| id | gravedad | qué hacer |
|---|---|---|
| R1-A-F9 | faltante | Añadir en el SQL de F2 topes de tamaño del jsonb y slots válidos (GRANT por columna, RPC y copias ya están en §4) |

### F3
| id | gravedad | qué hacer |
|---|---|---|
| INV-A-F12 | faltante | Documentar en server/verify que «sin build step» es solo del cliente y que js/sim se importa igual en navegador, Node y workerd (rutas relativas, sin window) |

## RESUELTA (id · §)
| id | § |
|---|---|
| INV-A-P11 | §3.4 (hello: proto, cat, simHash), §3.7 (version.json, N-1) |
| INV-A-P12 | §3.6, §3.2 T6, §9 (subpasos ≤ 1/60, snapshots 20 Hz, F3 a 60 Hz) |
| INV-A-P13 | §3.2 T1, T4, T5 (contrapresión, ≤ 1.100 B, completa por r) |
| INV-A-P14 | §4 (rev por trigger, escritura condicional, .bak-nube) |
| INV-A-P16 | §1.1 (la cifra de Last Epoch es solo referencia; la meta la validan nuestras pruebas) |
| INV-A-F1 | §2.1 (aceptar/rechazar/bloquear), §3.8 (hostToken, expulsar), §5.3 (tamaño y ritmo por par) |
| INV-A-F2 | §3.7 (Worker responde {mp, ladder, minProto}) |
| INV-A-F3 | §2.3 (solo héroes abiertos, guardado antes de enviar, giftId) |
| INV-A-F6 | §4 (copia semanal a R2, 4 semanas, prueba de restauración) |
| INV-A-F7 | §3.10 (telemetría por sesión), §2.9 (Copiar diagnóstico) |
| INV-A-F8 | §8 (matriz E10: Chrome, Edge, Firefox, mixtos), §2.1/R13 (Safari) |
| INV-A-F9 | §3.8 (modo degradado), §4 (localStorage nunca se borra) |
| INV-A-F11 | §3.6 punto 4 (H2 sin SharedArrayBuffer, sin COOP/COEP) |
| INV-B-P5 | §1.1 (cifra de PoE/Last Epoch solo referencia; validan las pruebas) |
| INV-B-P7 | §9 F3 (juegas en local a 0 ms y el DO re-simula en sombra) |
| INV-B-P8 | §3.6 (semifijo ≤ 1/60), §6 («no entra en F0»: simPos/prevPos y paso fijo son F3) |
| INV-B-P9 | §9 requisitos de F3 (detmath + lint tipo test67, puerta en Chrome, Firefox y workerd) |
| INV-B-P10 | §3.8 (Worker + DO, D3; Supabase solo en F2; Trystero con password de respaldo) |
| INV-B-P11 | §3.8, §3.10 (credenciales solo por el DO, revocación, límite de ritmo, Turnstile, consumo en GraphQL) |
| INV-B-P12 | §3.5.1 (ATK con posición y tolerancia de alcance a favor de la víctima) |
| INV-B-P13 | §5.3 (sanitize.js, textContent, sanitizeSave con lista blanca), §5.4 |
| INV-B-P14 | §2.4 (vida de vista como función pura; SPAWN con mods, party, pact) |
| INV-B-P15 | §2.2 (excursión con carga local nueva y Unirse al grupo; D8) |
| INV-B-P17 | §3.4 (netId sin reutilizar por época), §3.2 T2 (acuse de golpes, SPAWN/GONE urgentes); no hay delta contra acuse |
| INV-B-P18 | §3.2 T6 (20 Hz con reloj propio), §3.9 (cuentas rehechas) |
| INV-B-P20 | §5.2 punto 1 (héroe reconstruido con recompute), §3.2 T4 (stats publicados calculados por el anfitrión) |
| INV-B-F1 | §8 R1 (Chrome, Edge, Firefox; metrónomo H1b), §2.1/R13 (Safari) |
| INV-B-F2 | §8 (LoopbackNet con latencia, jitter, pérdida y desorden; ?lag/loss/jitter) |
| INV-B-F3 | §3.5.1 (reloj, tick de simulación), §3.4 |
| INV-B-F4 | §3.9 (peor caso), §7 (banco GRUPO con peor caso de mensajes) |
| INV-B-F6 | §3.7 (version.json, reg.update, controllerchange) |
| INV-B-F8 | §3.10 (telemetría), §2.9 (Copiar diagnóstico), §8 |
| INV-B-F9 | §3.8 (Ocultar mi IP), §4 y §3.10 (aviso de privacidad) |
| INV-B-F10 | §3.2 (bibliotecas de netcode evaluadas) |
| INV-B-F12 | §6 (una sola tabla F0 ordenada por dependencia) |
| R1-A-P12 | §4 (manual linking, Turnstile, flujo «ya tiene héroes», limpieza de anónimos) |
| R1-A-P14 | §3.2 T5 (dcSCTP de Chrome y el dato de 2 MB corregido), §8 R3 (pares mixtos) y E10 (relé UDP/TLS) |
| R1-A-P15 | §3.5.1 (RTT por acuses de u) |
| R1-A-P16 | §2.1 (código en el fragmento #sala=) |
| R1-A-P18 | §2.3 (guardado inmediato de ambos lados y giftId) |
| R1-A-P20 | §3.10 y §3.8 (tarjeta/sobreuso «no documentado», revocación en vivo [M] en R2) |
| R1-A-F1 | §3.7 (BUILD/proto, N-1, interruptor), §3.10 (despliegue fuera de hora), R2 |
| R1-A-F2 | §3.10 (telemetría, Workers Logs) |
| R1-A-F3 | §3.10 (cron de consumo, corte a 800 GB, modo degradado) |
| R1-A-F5 | §3.8 (SQLite del DO, alarma deleteAll, reconexión, serializeAttachment) |
| R1-A-F6 | §3.8 (renovación con setConfiguration + restartIce), §3.10 (R2 con TTL de 5 min) |
| R1-A-F7 | §5.4 (validación en cada receptor, save que se niega a escribir no finitos) |
| R1-A-F10 | §4 (manual linking, flujo de conflicto, Turnstile, limpieza, borrado, aviso) |
| R1-A-F11 | §4 (pagehide con keepalive ≤ 60 KiB, alijo aparte) |
| R1-A-F13 | §3.10 (wrangler secret), §3.8 (new_sqlite_classes) |
| R1-A-F14 | §8 (matriz E10 y R3 con pares mixtos) |
| R1-B-P7 | §3.5 (muerte prevista), §1.1 |
| R1-B-P8 | §6 #6, §7 (amenaza en fracciones de la vida de vista) |
| R1-B-P9 | §3.4 (banderas u32, extensión JEFE), §8 net-contrato |
| R1-B-P10 | §7 y D18 (los DoT los simula su dueño; TICKS en vez de DOTX/DOTR/DOTEND) |
| R1-B-P11 | §3.2 T3, T6, T7 (inmediatos solo urgentes, snapshot a 20 Hz, sobrecarga por paquete) |
| R1-B-P12 | §3.2 T2 (plazo adaptativo, dedupe con ventana cíclica), R3 mixto |
| R1-B-P13 | §3.5.1 (RTT por acuses de u) |
| R1-B-P14 | §3.8 (TTL 24 h, renovación antes de restartIce), §8 E10 (más de 2 h) |
| R1-B-P15 | §3.7 (pausa cooperativa con pause/resume) |
| R1-B-P16 | §3.4 (heroDelta), §5.2 |
| R1-B-P18 | §8 (dos ventanas sin solaparse, perfil de guardado, por turno) |
| R1-B-P19 | §3.4 (coordenadas desde el origen de la rejilla) |
| R1-B-P20 | §3.4 (PROJ con destino y duración) |
| R1-B-P21 | §3.4 (Δtick y bit de salto en el registro de héroe) |
| R1-B-P22 | §5.4 (ritmo por mensajes agrupados, topes del banco × 2, sin expulsión automática) |
| R1-B-P23 | §3.8 (latido con setWebSocketAutoResponse, reconexión, SQLite) |
| R1-B-P24 | §3.5 (reconciliación de la barra con acuses de golpes) |
| R1-B-P25 | §3.4 (KILL con habilidad y estado al morir) |
| R1-B-P27 | §3.6.1 (Ahorro de memoria, freeze/wasDiscarded), §8 R1 (p95 del jitter ≤ 20 ms) |
| R1-B-P28 | §13.1/13.2 (mockup corregido a «0 ms en tus habilidades») |
| R1-B-F1 | §3.4 (DISP, party, pause, heroDelta, FIELD v2, extensiones MOD/JEFE; DoT por D18) |
| R1-B-F2 | §3.5.1 (regla de tiempo por clase de mensaje) |
| R1-B-F3 | §3.4 (época), §3.5.1 (caducidad), §3.2 T2 (dedupe cíclico) |
| R1-B-F4 | §3.4 (lápidas y versión por emisor en pares inicio/fin) |
| R1-B-F5 | §3.2 T10 (área de interés para urgentes) |
| R1-B-F6 | §3.2 T2 y T7, §3.9 |
| R1-B-F8 | §8 (net-sim con ráfagas y cortes, R3 mixto, E10 de más de 2 h) |
| R1-B-F9 | §8 (net-contrato) |
| R1-B-F10 | §3.7 |
| R1-B-F11 | §3.6 (el invitado descarta el tiempo oculto) |
| R1-B-F12 | §3.8 (misma red, mDNS), §8 E10 |
| R1-B-F13 | §2.1 (Safari sin Encender hoguera) |
| R1-B-F14 | §7 y D18 (los DoT y marcas ajenos no cuentan) |
| R2-A-P11 | §4 (signInAnonymously al activar nube, Turnstile, manual linking, limpieza) |
| R2-A-P12 | §4 (pagehide con keepalive, marca pendiente) |
| R2-A-P13 | §3.5.1 |
| R2-A-P14 | §3.8 (env, Origin, redirecciones) |
| R2-A-P15 | §3.8 (hostToken, rejoinToken) |
| R2-A-P16 | §3.8 (filtrar :53, conservar 443 TLS) |
| R2-A-P17 | §3.9 (tabla de TURN con casos) |
| R2-A-P18 | §9 F3 (holgura de 3 s, pausa > 10 s) |
| R2-A-P19 | §9 (grabaciones a 2 Hz, top N, R2) |
| R2-A-P20 | §3.8, §9 (Worker signal y Worker verify aparte) |
| R2-A-P21 | §4 (aviso, Borrar mi cuenta, no copiar el correo) |
| R2-A-F1 | §3.10 (tabla de cuotas con alertas) |
| R2-A-F2 | §3.10 (manual de operación) |
| R2-A-F3 | §3.10, §11 E0 (criterios de R2) |
| R2-A-F4 | §3.7 |
| R2-A-F5 | §3.8 (respaldo y modo degradado) |
| R2-A-F6 | §3.10, §14 #10 (sin tarjeta hasta F3) |
| R2-A-F7 | §3.8, §4, §9 (alarma deleteAll, limpieza de anónimos, rotación de grabaciones) |
| R2-A-F8 | §4 (copia a R2 con prueba de restauración) |
| R2-A-F9 | §3.10 (telemetría anónima) |
| R2-A-F10 | §3.8 (entornos separados) |
| R2-B-P6 | §3.2 T2, §3.4 (HITS, redundancia acotada), §3.9 |
| R2-B-P7 | §5.4 (topes del banco × 2, TICKS agrupados) |
| R2-B-P8 | §3.4, §3.5.1 (tick = tiempo de simulación, RTT por acuses) |
| R2-B-P9 | §2.2, §3.7 (viaje pendiente, carga local nueva) |
| R2-B-P10 | §3.7 (pause/resume de toda la simulación) |
| R2-B-P11 | §2.3, §2.4 (KILL con máscara de elegibles, n sin ausentes) |
| R2-B-P12 | §3.4, §3.5.1 (Δtick y atraso adaptativo) |
| R2-B-P13 | §3.5.1 y D17 (preparación adaptativa, atacante en tu presente) |
| R2-B-P14 | §3.4 y D19 (PROJX) |
| R2-B-P15 | §3.5 (auras y Espinoso) |
| R2-B-P16 | §3.2 T8, T9, §3.9 |
| R2-B-P17 | §3.2 T4, §3.7 (trozos ≤ 1.100 B, perfil liviano) |
| R2-B-P18 | §3.6 (H1b), §8 R1 con 1 invitado |
| R2-B-P19 | §3.8, §3.10 (TTL 24 h, renovación, GraphQL) |
| R2-B-P20 | §3.5 (pool de réplicas por netId) |
| R2-B-P21 | §5.3 (connect-src de Nostr, worker-src) |
| R2-B-P22 | §8 (&perfil=b, dos ventanas) |
| R2-B-P23 | §8 (pares mixtos en R3 y E10) |
| R2-B-P24 | §3.8, §8 E10 (misma red) |
| R2-B-P25 | §3.8 (clase SQLite, autorrespuesta) |
| R2-B-P26 | §3.5 (dos reversiones, encadenados e inmunes) |
| R2-B-P27 | §3.8, §2.9 (relé lento) |
| R2-B-P28 | §11 (E0 con p99, estimaciones subidas) |
| R2-B-F1 | §3.4 (arriendos EST) |
| R2-B-F2 | §6 #12 (lint y API de escrituras) |
| R2-B-F3 | §3.5 (dos vistas) |
| R2-B-F4 | §3.5 (reconciliación) |
| R2-B-F5 | §3.7 |
| R2-B-F6 | §2.3 |
| R2-B-F7 | §3.6.1 |
| R2-B-F8 | §3.6, §8 |
| R2-B-F9 | §3.2 T8 |
| R2-B-F10 | §3.5.1 |
| R2-B-F11 | §3.4, §3.5.1 |
| R2-B-F12 | §3.5 |
| R2-B-F13 | §3.4 y D19 |
| R2-B-F14 | §3.5 |
| R2-B-F15 | §3.2 T4 |
| R2-B-F16 | §3.8, §3.10 |
| R2-B-F17 | §8 (matriz E10) |
| R2-B-F18 | §2.9 (Copiar diagnóstico) |
| R2-B-F19 | §8 (&perfil=b) |

## DESCARTAR (id · razón)
| id | razón |
|---|---|
| INV-A-P15 | SFU de Cloudflare como plan B: D3 aprobada (Worker + DO + TURN); es una nota, no cambia el diseño |
| INV-A-P17 | Oracle no figura en el diseño (el hosting es Cloudflare/Vercel/Supabase); aplica a tecnologia.md |
| INV-A-P18 | No hay api/turn en Vercel: las credenciales las emite el Worker/DO; el reinicio 00:00 UTC ya está en §3.10 |
| INV-A-F10 | El diseño usa DO y no Supabase Realtime/Presence ni canales privados; los GRANT del 30-oct ya están en §4 |
| INV-B-P21 | Cifras sin fuente de tecnologia.md; ninguna cambia una decisión; el CGNAT del anónimo ya está en §4 |
| R1-B-F15 | Ya hubo ronda 2 externa y verificación de las altas (§13.0, §13.1); no hay nada que implementar |
