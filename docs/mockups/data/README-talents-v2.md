# Talentos v2 por clase: contrato de datos del mockup

> Paso 2g. Molde: la **Maga** aprobada (commits `d75e7ed` y `d8dd49c`; diseño en `docs/paso2g-maga-coherencia.md`, sobre todo **§17 «Plantilla para otras clases»**).
> Este archivo es el **contrato** del formato: lo que debe tener `data/talents-v2-<clase>.js` para que el mockup lo pinte y el validador lo acepte.
> Si algo de aquí choca con el documento de diseño, manda el documento; avísalo para corregir este contrato.

## 0. Archivos y quién edita cada uno

| Archivo | Qué es | Quién lo edita |
|---|---|---|
| `docs/mockups/skills-ux.html` | El mockup: libro de habilidades y panel de talentos (el **motor**). No contiene datos de ninguna clase | Nadie sin coordinar |
| `data/talents-v2-comun.js` | Reglas comunes a todas las clases: ritmo de puntos, presupuesto, puertas, **rejillas obligatorias** y la lista de clases del selector | Nadie sin coordinar (vale para todas) |
| `data/talents-v2-maga.js` | La Maga completa (kit, 3 especializaciones, 3 árboles héroe, 12 builds). **Es el ejemplo de referencia** | Congelado (aprobado) |
| `data/talents-v2-guerrero.js` | Guerrero (esqueleto) | Solo el diseñador del Guerrero |
| `data/talents-v2-arquera.js` | Arquera (esqueleto) | Solo el diseñador de la Arquera |
| `data/validar-talentos.mjs` | Validador (`node`) | — |
| `data/README-talents-v2.md` | Este contrato | — |

Los dos diseñadores trabajan **en paralelo sin tocar el mismo archivo**: cada uno solo edita el suyo.

## 1. Cómo se carga

- El HTML carga, con `<script src>` **clásico** (funciona abriendo el archivo como `file:///`, sin servidor): `talents-v2-comun.js` y después `talents-v2-maga.js`, `talents-v2-guerrero.js` y `talents-v2-arquera.js`.
- `comun.js` define `window.TV2` (reglas) y crea `window.TALENTS_V2_CLASSES`. Cada archivo de clase se registra así:

```js
(function () {
  'use strict';
  const TV2 = window.TV2;
  const { n1 } = TV2;                              // n1(1.05) → "1,05" (números con coma)
  const I = id => `talents/guerrero-${id}.webp`;   // ayuda para iconos
  window.TALENTS_V2_CLASSES = window.TALENTS_V2_CLASSES || {};
  window.TALENTS_V2_CLASSES.guerrero = { /* … el objeto de clase (§2) … */ };
})();
```

- **No** uses `import`/`export` (los módulos no cargan por `file:///`), ni variables globales que no sean ese registro: todo dentro de la función.
- Si el archivo de una clase **no existe** o falla, el mockup no se rompe: su panel de talentos muestra **«En diseño»** (con el selector de clase) y su libro, el catálogo 2f de siempre.
- Mientras un árbol esté **vacío** (`[]`), el panel dibuja su **rejilla obligatoria en gris** con la etiqueta «En diseño». Mientras `catalog` esté vacío, el libro enseña el **catálogo 2f actual** de la clase como referencia («Kit actual (2f)»).

### Ver la clase en el mockup

`docs/mockups/skills-ux.html?cls=guerrero&view=talents` (ábrelo como archivo: `file:///D:/Proyectos/IntentoRPG/docs/mockups/skills-ux.html?...`; las imágenes salen de `file:///D:/Proyectos/IntentoRPG-assets/web/` y por `http://` no cargan).

| Parámetro | Valores |
|---|---|
| `cls` | `maga` · `guerrero` · `arquera` (otra cosa → Maga) |
| `view=talents` | Abre el panel de talentos (tecla `N`; `T` vuelve al libro) |
| `lvl` | `5` · `10` · `18` · `40` · `60` · `69` (Paragon en gris) · `70` · `80` · `100` |
| `spec` | Especialización inicial (id de la clase) |
| `loadout` | Una build de la clase (fija su especialización) |
| `res` | `1366` · `1920` |
| `tipnode` | Tooltip de un nodo: `cls:c6`, `spec:b9`, `hero:h4` (los hexágonos abren sus dos opciones encima) |
| `tipskill` | Tooltip de una habilidad del libro |
| `hl` | Resalta los nodos que tocan una habilidad |
| `alt=1` · `rm=1` · `shot=1` | Detalle de `Alt` · reducir movimiento · oculta la barra de control (para capturas) |
| `demo` | `spend` · `gate` · `choice` · `hover` · `hoveract` · `pick` · `rclick` · `undo` · `reveal` · `swap` · `spec` · `cls` · `specswap` · `hl` · `code` (ids en `demo`, §2) y `&t=<ms>` congela las animaciones |
| `legacy=1` | Libro 2f y **panel real del juego** (talentos actuales): sirve para auditar la clase de hoy |

**Selector de clase:** el botón **Cambiar** (el de la especialización) abre el selector, cuya primera fila es **Clase: Maga · Guerrero · Arquera** con el mismo estilo de botón. También está en el estado «En diseño», en el desplegable «Clase» de la barra de control y en `?cls=`. Cambiar de clase empieza de cero (árbol, builds y configuraciones guardadas son de cada clase).

## 2. El objeto de clase

Ejemplos de la Maga (`data/talents-v2-maga.js`). «Oblig.» = el validador lo exige.

| Campo | Tipo | Oblig. | Qué es | Ejemplo (Maga) |
|---|---|---|---|---|
| `formato` | número | sí | Versión del contrato (`TV2.formato`) | `1` |
| `estado` | texto | sí | `'esqueleto'` · `'diseño'` · `'aprobado'`. La cinta de arriba a la derecha se oculta solo con «aprobado» | `'aprobado'` |
| `id` | texto | sí | Igual a la clave del registro | `'maga'` |
| `name` · `res` · `resIcon` · `color` | texto | sí (salvo `color`) | Nombre, recurso, icono del recurso (`ui/<resIcon>.webp`) y color | `'Maga'` · `'Maná'` · `'res_mana'` · `'#ff8a3d'` |
| `emblem` | ruta | sí | Icono de la columna de clase y del selector de clase | `'ui/res_mana.webp'` |
| `clsArt` | ruta | sí | Arte de fondo (muy tenue) de la columna de clase | `'specs/arcanista.webp'` |
| `book` | `{ baseIcon, baseNote }` | no | Cabecera «Kit base» del libro | `{ baseIcon:'ui/res_mana.webp', baseNote:'fuego, hielo y arcano' }` |
| `specOrder` | 3 ids | sí | Las especializaciones **del juego**, en el orden de las tarjetas | `['piromante','crionte','arcanista']` |
| `defaultSpec` | id | sí | La que se elige por defecto | `'piromante'` |
| `specs` | `{ <id>: {…} }` | sí | Metadatos de cada especialización (§3) | |
| `catalog` | lista | sí | Habilidades del libro (§4) | 23 habilidades |
| `fallbackBar` | `{ lmb, rmb, k1, k2, k3, k4 }` | sí | Si una habilidad de la barra aún no se conoce (nivel), cae a esta | `{ lmb:'m_dardo', rmb:'bola_fuego', k1:'m_parpadeo', k2:'m_barrera', k3:null, k4:null }` |
| `specBar` | `{ <spec>: { bar, forge, sel } }` | sí | Barra, variantes (`'A'` = I, `'B'` = II) y habilidad seleccionada al elegir la especialización | `piromante: { bar:{ lmb:'m_dardo', rmb:'bola_fuego', k1:'m_estela_ignea', k2:'meteoro', k3:'p_llamarada', k4:'m_u_supernova' }, forge:{ m_dardo:'A', bola_fuego:'B', m_parpadeo:'A' }, sel:'bola_fuego' }` |
| `reco` | `{ <spec>: { <skillId>: 'A'\|'B' } }` | sí (puede ir vacío) | Variante recomendada (★ en el libro y botón «Recomendado» del libro) | `piromante: { m_dardo:'A', bola_fuego:'B', … }` |
| `sup` | `{ <skillId>: [ids] }` | sí (puede ir vacío) | Engarces iniciales del mockup | `{ bola_fuego:['amplify','wide'] }` |
| `mech` | `{ <spec>: {…} }` | sí | Textos de la barra de mecánica (§3) | |
| `innate` | `{ <spec>: {…} }` | sí | Pasiva de la especialización (§3) | |
| `groups` | `{ <flag>: { label, ids } }` | sí (puede ir vacío) | Nodos que tocan «todo tu X»: el nodo lleva `<flag>: true` | `fire: { label:'Toca todo tu Fuego', ids:['m_dardo','bola_fuego',…] }` |
| `tree` | `{ cls, spec, hero }` | sí | Los árboles (§5–§8) | |
| `rejilla` | `{ spec?, <specId>?, cls?, hero? }` | no | Reorden por nivel (§6): casilla nueva `[fila, columna]` de cada número. `spec` vale para las tres especializaciones; `<specId>`, solo para esa | `{ arcanista: { 3:[4,4], 13:[1,5], 7:[5,5], 17:[2,6] } }` |
| `specHero` | `{ <spec>: [heroId, heroId] }` | no | Se deduce de `hero[].specs`; ponlo solo para otro orden de pestañas | `piromante: ['crono','invoca']` |
| `builds` | `{ <clave>: build }` | sí | 4 por especialización, una híbrida (§9) | `brasa`, `cataclismo`, `ignicion`, `hibrido`… |
| `defaultBuild` | `{ <spec>: clave }` | sí | La que aplica «Recomendado» y la de inicio | `{ piromante:'brasa', crionte:'glaciar', arcanista:'rayo' }` |
| `demo` | objeto | no | Ids de nodo para las demos de captura | `{ spend:'s16', choice:'s9', hover:'s9', hoveract:'t4', rclick:'s9', pick:'s8', undo:'s23', hl:'meteoro', swapTo:'crionte', gate:{ ranks:{ c2:2, c1:2, c3:2, c6:1 }, ch:{ c6:'B' }, buy:['c5','A'] } }` |

Lo **común** (puntos por nivel, presupuesto, puertas, rejillas) **no** va en el archivo de clase: está en `talents-v2-comun.js` y es igual para todas (§10). Solo el reorden por nivel de la clase va en ella (`rejilla`, §6).

## 3. Especializaciones: metadatos, barra de mecánica y pasiva

```js
specs: {
  piromante: { id:'piromante', name:'Piromante', role:'Daño en área', mech:'Calor', mechIco:'ui/st_quemadura.webp',
    line:'Todo arde: la Quemadura se propaga y estalla.', innate:'Bola de Fuego: explosión 100 → 350 %', gauge:'calor' },
},
mech: {
  piromante: { n:'Calor', range:'0–100', ico:'ui/st_quemadura.webp', gen:'+5 por golpe de Fuego (1 por instante)',
    out:'A 100: Ignición Total. La siguiente Bola de Fuego o Meteoro, gratis y crítica', loss:'−10 por segundo tras 3 s sin ganar',
    feed:['m_dardo','bola_fuego','p_llamarada','meteoro'], alt:'calor · perFireHit 5 · decayAfter 3 · decayRate 10', feedNames:{ m_dardo:'Saeta Ígnea' } },
},
innate: {
  piromante: { sk:'bola_fuego', n:'Bola de Fuego del Piromante', l:'La explosión pasa del 100 % al 350 % a 2 m.', f:'Con otra especialización vuelve al 100 %' },
},
```

| Campo | Qué es |
|---|---|
| `specs.<id>.role` | Rol en 1–3 palabras (tarjeta del selector). Respeta el rol que tiene hoy en el código; el **Guardián es el tanque** |
| `mech` / `mechIco` | Nombre de la barra y su icono (chip del libro y del selector) |
| `line` | La fantasía en una frase |
| `innate` | La pasiva en una frase corta (chip) |
| `gauge` | Id de la barra en `js/spec-mechanics.js` (`sed`, `bastion`, `fervor`, `calor`, `escarcha`, `cargas`, `concentracion`, `coto`, `impulso`). El libro la dibuja con el **widget real** del juego. Se usa la que ya existe (§17.1) |
| `sketch: true` | Tarjeta con la marca **ESBOZO** (para el esqueleto; quítalo cuando el kit esté diseñado) |
| `mech.<spec>.gen` · `out` · `loss` | Los tres textos del tooltip de la barra: **generar, descargar, pérdida** |
| `mech.<spec>.feed` | Ids del catálogo que la alimentan (iconos del tooltip); `feedNames` cambia el nombre mostrado (p. ej. la variante del Dardo) |
| `innate.<spec>.sk` | Habilidad cuyo icono se ve en el chip de la pasiva (`null` → emblema) |

Barras del juego por especialización: Guerrero `berserker → sed`, `guardian → bastion`, `cruzado → fervor`; Arquera `tiradora → impulso`, `francotiradora → concentracion`, `montaraz → coto` (lo comprueba el validador).

## 4. Habilidades del libro (`catalog`)

```js
{ id:'m_dardo', n:'Dardo Arcano', cat:'basic', req:1, elem:'arcane', coef:1.05, gen:3, s:'Dispara un dardo a 20 m. Cada impacto te devuelve 3 de maná.',
  M:{ n:'Dardo Veloz', s:'+40 % de velocidad del proyectil y +2 m de alcance.', k:'★add{speed:+40%} · range +20' },
  A:{ n:'Saeta Ígnea', r:'AREA', s:'Se vuelve de Fuego y estalla a 1,5 m (30 %).', k:'★elem fire · ★set{splash:.3, radius:1.5}' },
  B:{ n:'Saeta Gélida', r:'CTRL', s:'Se vuelve de Hielo: ralentiza 20 % 1,5 s; −10 % daño.', k:'★elem frost · slow 1.5 · slowPct 20 · dmg −10' } },
{ id:'p_llamarada', n:'Llamarada', cat:'spec', req:10, spec:'piromante', elem:'fire', coef:1.5, cost:25, cd:8, icon:'talents/maga-piromante-s0.webp', s:'…', M:{…}, A:{…}, B:{…} },
{ id:'m_t_bloque', n:'Bloque de Hielo', cat:'defense', req:21, talent:true, grantBy:'c11', elem:'frost', cd:90, icon:'talents/maga-clase-c12.webp', s:'Te encierras en hielo 4 s: no recibes daño, pero no te mueves.' },
```

| Campo | Tipo | Qué es |
|---|---|---|
| `id` | texto | Único en la clase (los del juego si ya existen) |
| `n` · `s` | texto | Nombre y **una línea** del libro (≤ 120 caracteres) |
| `cat` | `basic` · `spender` · `movement` · `defense` · `utility` · `spec` · `ultimate` | Categoría (las **etiquetas** visibles son Básica · Principal · Movilidad · Defensa · Utilidad · Insignia · Definitiva). Ranuras: básica `IZQ`, principal `DER`/`2`, movilidad `1`, defensa/utilidad `2`, insignia `3`, definitiva `4` |
| `req` | número | Nivel en que se aprende |
| `elem` | `physical` · `fire` · `frost` · `arcane` · `nature` · `holy` | Elemento |
| `coef` · `cost` · `cd` · `gen` | números | Daño (× arma), coste, enfriamiento (s), recurso que genera |
| `spec` | id | Solo con esa especialización (kit de especialización) |
| `icon` | ruta | Si no, `icons256/<id>.webp` |
| `innate` | `{ <spec>: texto }` | Chip dorado en la forja cuando esa especialización la cambia |
| `M` · `A` · `B` | `{ n, s, k }` (+ `r` en A/B) | **Forja:** Mejora (Nv+3) y dos variantes (Nv+6) de **papel opuesto** (`r`: `UNI`, `AREA`, `CTRL`, `AGU`, `APO`, `MOV`). `k` = detalle técnico (se ve con `Alt`) |
| `talent: true` · `grantBy` | — | Habilidad que concede la **opción A** de un nodo de elección (`grantBy` = id del nodo); van a la ranura `2` (`defense` o `utility`) y no tienen forja |

**Reglas del kit (§17.1):** kit base de **5** (Nv1–9): 1 básica, 2 principales de estilos distintos, 1 movilidad y 1 defensa; nada fuerte de una especialización. Cada especialización, **4**: insignia `spec` (Nv10), movilidad o utilidad (Nv12), principal (Nv14) y definitiva (Nv15). La forja transforma (forma, geometría, elemento, ritmo); el talento añade o multiplica (§8 del doc). Ningún nombre repetido entre habilidades, variantes y nodos.

## 5. Árboles

```js
tree: {
  cls:  [ /* 30 nodos c1…c30: árbol de CLASE (§7) */ ],
  spec: { piromante: [ /* 29 nodos s0…s28 (§6) */ ], crionte: [ /* i0…i28 */ ], arcanista: [ /* a0…a28 */ ] },
  hero: [ /* 3 árboles héroe (§8) */ ],
},
```

**Ids:** únicos en **toda** la clase. Los de clase son `c1…c30` y **solo** ellos empiezan por `c` + número (el motor separa así las elecciones de clase al cambiar de especialización). Los de especialización y héroe son `<prefijo><n>`, con `n` el número de la rejilla (Maga: `s`, `i`, `a` · `t`, `f`, `e`). Mismo número = misma posición en las tres especializaciones (`s9` del Piromante = `i9` del Crionte).

### Nodo

```js
{ id:'c3', n:'Reflejos Arcanos', t:'p', tag:'num', r:0, c:5, max:2, d:r=>`Parpadeo se recarga en ${12-2*r} s (antes 12 s)`, touch:['m_parpadeo'], icon:I('clase-c3'), impl:'mod m_parpadeo cdr · existe' },
{ id:'c11', n:'Bloque de Hielo o Aguante', t:'c', tag:'mec', r:3, c:0, max:1, req:['c8'], icon:I('clase-c12'), opts:[
  { k:'A', n:'Bloque de Hielo', d:'Habilidad (ranura 2): te encierras en hielo 4 s; no recibes daño ni te mueves. Se recarga en 90 s', role:'AGU', act:'m_t_bloque', impl:'activa m_t_bloque · existe' },
  { k:'B', n:'Aguante Arcano', d:'Un golpe que te mataría te deja con 1 de vida y una Barrera gratis. Una vez cada 120 s', role:'AGU', impl:'power m_aguante · NUEVO (onLethal)' } ],
  win:'A, contra golpes de jefe que se ven venir (ocupa la ranura 2). B, siempre activo y sin ocupar ranura' },
{ id:'s0', n:'Ignición', t:'k', tag:'mec', r:0, c:3, max:1, free:true, d:()=>'Tus golpes de Fuego queman (…)', fire:true, icon:I('piromante-s0'), impl:'…' },
{ id:'s25', n:'Incendio Forestal', t:'f', tag:'mec', r:8, c:0, max:3, req:['s22'], d:r=>`Un enemigo aguanta hasta 5 quemaduras tuyas. (…)${r > 1 ? `. Quemaduras +${20*(r-1)} %` : ''}`, arch:'brasa', final:'Brasa', icon:I('piromante-x1'), impl:'…' },
{ id:'s28', n:'Corazón del Sol', t:'x', tag:'mec', r:9, c:3, max:4, req:['s25','s26','s27'], d:r=>['1) …', '2) …', '3) …', '4) …'].slice(0, r).join(' '), fire:true, icon:I('piromante-x1') },
```

| Campo | Tipo | Oblig. | Qué es |
|---|---|---|---|
| `id` | texto | sí | Ver «Ids» arriba |
| `n` | texto | sí | Nombre corto (en el panel se ve icono + rango; el resto, en el tooltip) |
| `t` | `p` · `c` · `k` · `f` · `x` | sí | Pasiva · elección A/B · clave (gratis) · final · ápice. **Forma:** círculo = pasivo (también clave, final con doble aro y ápice con 4 rombos); **hexágono** = elección; **cuadrado** = la opción que concede habilidad (`act`) |
| `tag` | `num` · `mec` | sí | «número» o «mecánica». Filas 3–9: **≥ 60 % mecánica**. Un número debe ser ≥ +10 % en su eje |
| `r` · `c` | números | sí | Fila y columna (las de la rejilla) |
| `max` | entero | sí | Rangos (los de la rejilla; una elección tiene 1) |
| `req` | ids | si no es fila 0 | Basta **uno** de ellos **al máximo** |
| `free: true` | — | clave | El nodo clave es gratis |
| `d` | `r => texto` | pasivas | Efecto en el rango `r`. Con números, «antes X» cuando cambia un valor, **≤ 120 caracteres** en cada rango. Ápice: `'1) … 2) …'` por rango (cada segmento ≤ 120) |
| `opts` | 2 opciones | elecciones | `{ k:'A'\|'B', n, d, role, act?, touch?, icon?, impl? }`. `role`: `UNI` (contra jefes), `AREA` (contra grupos), `CTRL` (control), `AGU` (supervivencia) |
| `act` | id del catálogo | — | La opción concede esa habilidad (solo en la **opción A**, ranura 2; máx. 3 en clase y 1 por árbol héroe). En el catálogo lleva `talent:true, grantBy:'<id del nodo>'` |
| `win` | texto | elecciones | **«Cuál conviene»** en palabras: «A, contra jefes… B, contra grupos…» |
| `touch` | ids | no | Habilidades que toca (iluminación en el libro y en «Tu kit») |
| `<flag>: true` | — | no | Toca todo un grupo de `groups` (Maga: `fire`, `frost`, `arcane`) |
| `hyb` | texto | híbridos | «Brasa + Ignición» (contorno discontinuo y línea del tooltip) |
| `final` | texto | finales | Rama del final («Defensa», «Brasa»…) |
| `arch` | texto | no | Arquetipo (para tablas y lectura) |
| `icon` | ruta | no | Si falta: `talents/<clase>-<clase\|spec\|héroe>-<id>.webp` (§11) |
| `impl` | texto | no | Nota de implementación (se ve con `Alt`) |

## 6. Rejilla obligatoria del árbol de ESPECIALIZACIÓN (29 nodos · 59 rangos · filas 0–9)

La misma para las tres especializaciones de **todas** las clases (`TV2.REJILLA.spec`). Columna izquierda = arquetipo **A**, centro = **B**, derecha = **C**. Puertas: 8 puntos → fila 4 · 20 → fila 7 · 25 → ápice.

| n | Fila | Col. | Rangos | Tipo | Requiere (uno al máximo) | Papel | En la Maga: Piromante · Crionte · Arcanista |
|---|---|---|---|---|---|---|---|
| 0 | 0 | 3 | gratis | clave | — | nodo clave (la mecánica) | Ignición · Escarcha · Cargas Arcanas |
| 1 | 1 | 1 | 3 | pasiva | n0 | arquetipo A | Brasas · Frío Penetrante · Memoria Arcana |
| 2 | 1 | 3 | 3 | pasiva | n0 | arquetipo B | Calor Abrasador · Filo Helado · Mente Brillante |
| 3 | 1 | 5 | 3 | pasiva | n0 | arquetipo C | Mecha Corta · Viento Cortante · Flujo Constante |
| 4 | 2 | 0 | 2 | pasiva | n1 | arquetipo A | Llama Persistente · Escarcha Densa · Potencia Acumulada |
| 5 | 2 | 2 | 1 | pasiva | n1 o n2 | **híbrido A + B** | Chispas · Hielo Quebradizo · Rebote Cargado |
| 6 | 2 | 4 | 1 | pasiva | n2 o n3 | **híbrido B + C** | Combustible Volátil · Polvo de Diamante · Sello Cargado |
| 7 | 2 | 6 | 2 | pasiva | n3 | arquetipo C | Pira · Tormenta Creciente · Grieta Abierta |
| 8 | 3 | 1 | 1 | **elección** | n4 o n5 | elección que define el arquetipo A | Propagación o Brasa Profunda · Prisión: Amplia o Profunda · Rayo: Doble o Recargado |
| 9 | 3 | 3 | 1 | **elección** | n5 o n6 | elección que define el arquetipo B | Llamarada: Avivada o Voraz · Lanza: Larga o del Invierno · Orbe: Cargado o Atrayente |
| 10 | 3 | 5 | 1 | **elección** | n6 o n7 | elección que define el arquetipo C | Meteoro: Gemelo o Concentrado · Tormenta: Viva o Fría · Desgarro: Fijo o Voraz |
| 11 | 4 | 0 | 2 | pasiva | n8 | arquetipo A | Fuego Interior · Sangre Fría · Precisión Arcana |
| 12 | 4 | 2 | 2 | pasiva | n8 o n9 | arquetipo B | Pirotecnia · Astillas · Inercia |
| 13 | 4 | 4 | 2 | pasiva | n9 o n10 | arquetipo C | Ceniza Ardiente · Frío Intenso · Torrente Arcano |
| 14 | 4 | 6 | 1 | pasiva | n10 | arquetipo C | Impacto Sísmico · Suelo Helado · Maná Inagotable |
| 15 | 5 | 1 | 1 | **elección** | n11 o n12 | supervivencia | Fénix o Escudo de Llamas · Piel o Cristal · Desplazamiento o Velo |
| 16 | 5 | 3 | 2 | pasiva | n12 o n13 | **híbrido de los tres** (por la mecánica) | Brasero · Invierno Profundo · Resonancia |
| 17 | 5 | 5 | 2 | pasiva | n13 o n14 | arquetipo C | Estrellas Fugaces · Remolino · Sello Viviente |
| 18 | 6 | 0 | 2 | pasiva | n15 | arquetipo A | Brasa Errante · Congelación en Cadena · Carga Final |
| 19 | 6 | 2 | 2 | pasiva | n15 o n16 | arquetipo B | Ignición Rápida · Ruptura · Satélite |
| 20 | 6 | 4 | 2 | pasiva | n16 o n17 | común | Ola de Calor · Expansión Glacial · Agudeza |
| 21 | 6 | 6 | 1 | pasiva | n17 | arquetipo C | Estela Meteórica · Ojo Frío · Doble Grieta |
| 22 | 7 | 0 | 3 | pasiva | n18 | penúltimo A | Brasa Viva · Glaciar · Cargas Desbordadas |
| 23 | 7 | 3 | 3 | pasiva | n19 | penúltimo B | Combustión · Esquirlas · Orbe Múltiple |
| 24 | 7 | 6 | 3 | pasiva | n21 | penúltimo C | Cráter · Tormenta Perpetua · Fuente de Maná |
| 25 | 8 | 0 | 3 | **final** | n22 | final A | Incendio Forestal · Era Glacial · Tormenta de Cargas |
| 26 | 8 | 3 | 3 | **final** | n23 | final B | Combustión Perpetua · Cero Absoluto · Constelación |
| 27 | 8 | 6 | 3 | **final** | n24 | final C | Lluvia de Fuego · Invierno Eterno · Grieta Eterna |
| 28 | 9 | 3 | 4 | **ápice** | n25 o n26 o n27 | ápice (sirve a los tres) | Corazón del Sol · Corazón del Invierno · Singularidad |

Fijo (error si no se cumple): número de nodos, fila, columna, rangos, requisitos; clave en n0, finales en n25–27, ápice en n28 y las tres elecciones de la fila 3. Una pasiva de 1 rango puede volverse elección (o al revés) con aviso: cambia la forma, no el presupuesto.

**Reorden por nivel** (aprobado por el dueño, 2026-10-22): los primeros talentos deben tocar lo que ya conoces. Una clase puede recolocar números con `rejilla` (§2): `{ spec: { 4:[1,3], … } }` mueve el n4 a la fila 1, columna 3 en sus tres especializaciones (el Guerrero) y `{ arcanista: {…} }`, solo en esa (la Maga y la Arquera). La forma no cambia: el número conserva sus rangos y su tipo, va a una casilla del mismo tipo y sus requisitos son los de la casilla que ocupa. `TV2.reordenar` lo comprueba (permutación sin casillas repetidas ni entradas que sobren) y el validador compara cada árbol con su rejilla recolocada (`TV2.rejillaDe`).

## 7. Rejilla obligatoria del árbol de CLASE (30 nodos · 53 rangos · filas 0–8)

Toca el **kit base** y lo genérico de la clase; **ningún nodo nombra una habilidad de especialización** (G1). Tres caminos a tres finales de **utilidad o ritmo** (el daño grande vive en la especialización). Puertas: 8 → fila 4 · 24 → fila 7.

| Id | Fila | Col. | Rangos | Tipo | Requiere (uno al máximo) | En la Maga |
|---|---|---|---|---|---|---|
| c1 | 0 | 1 | 2 | pasiva | — | Reservas Profundas |
| c2 | 0 | 3 | 2 | pasiva | — | Intelecto Arcano |
| c3 | 0 | 5 | 2 | pasiva | — | Reflejos Arcanos |
| c4 | 1 | 0 | 3 | pasiva | c1 | Escudo Prismático |
| c5 | 1 | 2 | 1 | elección | c1 o c2 | Dardo: Certero o Sifón |
| c6 | 1 | 4 | 1 | elección | c2 o c3 | Principal: Núcleo u Onda |
| c7 | 1 | 6 | 1 | pasiva | c3 | Paso Fugaz |
| c8 | 2 | 1 | 2 | pasiva | c4 o c5 | Piel de Maná |
| c9 | 2 | 3 | 1 | elección | c5 o c6 | Nova: Congelante o Cortante |
| c10 | 2 | 5 | 1 | elección | c6 o c7 | Ralentizar o Disrupción |
| c11 | 3 | 0 | 1 | elección | c8 | Bloque de Hielo o Aguante (A = habilidad) |
| c12 | 3 | 2 | 2 | pasiva | c8 o c9 | Flujo de Maná |
| c13 | 3 | 4 | 2 | pasiva | c9 o c10 | Mente Afilada |
| c14 | 3 | 6 | 1 | elección | c10 | Parpadeo: Runa o Reparo |
| c15 | 4 | 1 | 1 | elección | c11 o c12 | Escudo de Maná o Mente Clara |
| c16 | 4 | 3 | 1 | elección | c12 o c13 | Armonía o Pureza Elemental |
| c17 | 4 | 5 | 1 | elección | c13 o c14 | Inversión o Anclaje (A = habilidad) |
| c18 | 5 | 0 | 2 | pasiva | c15 | Barrera Reforzada |
| c19 | 5 | 2 | 1 | pasiva | c15 o c16 | Barrera Resonante (híbrido) |
| c20 | 5 | 4 | 1 | pasiva | c16 o c17 | Escarcha Arcana (híbrido) |
| c21 | 5 | 6 | 1 | pasiva | c17 | Escarcha Tenaz |
| c22 | 6 | 1 | 1 | elección | c18 o c19 | Contrahechizo o Canalizador (A = habilidad) |
| c23 | 6 | 3 | 2 | pasiva | c19 o c20 | Ritmo Arcano |
| c24 | 6 | 5 | 2 | pasiva | c20 o c21 | Celeridad |
| c25 | 7 | 0 | 3 | pasiva | c22 | Cristal de Barrera (penúltimo) |
| c26 | 7 | 3 | 3 | pasiva | c23 | Torrente de Maná (penúltimo) |
| c27 | 7 | 6 | 3 | pasiva | c24 | Imagen Arcana (penúltimo) |
| c28 | 8 | 0 | 3 | **final** | c25 | Bastión Arcano · final «Defensa» |
| c29 | 8 | 3 | 3 | **final** | c26 | Archimaga · final «Arcano» |
| c30 | 8 | 6 | 3 | **final** | c27 | Paso del Vacío · final «Movilidad» |

## 8. Árboles HÉROE (Paragon): 3 por clase, 13 nodos cada uno

```js
{ id:'crono', n:'Cronomante', specs:['piromante','arcanista'], art:'ui256/menu_viajes.webp',
  line:'Marcas del Tiempo: el daño que haces vuelve a golpear',
  key:'Tu primer golpe marca al enemigo 4 s; al acabar, la marca repite el 30 % del daño que le hiciste',
  nodes:[ /* 13 nodos t0…t12 */ ] },
```

| Campo | Qué es |
|---|---|
| `id` · `n` | Id (distinto de los ids de especialización) y nombre |
| `specs` | Las **2** especializaciones que lo comparten. Cada especialización está en **exactamente 2** árboles (3 árboles: A+B, A+C, B+C) |
| `art` | Pestaña y fondo de la columna |
| `line` · `key` | Fantasía y nodo clave en una frase (se ven en el Paragon en gris) |
| `nodes` | 13 nodos (rejilla de abajo). Temáticos de la **clase**, no de un elemento ni de una especialización: su mecánica funciona con cualquier especialización |

Reglas: se abre con la especialización **31/31 gastada** (clave gratis + 10 puntos, Nv71–80: siempre quedan 2 fuera); si luego bajas de 31, queda **en pausa** (conserva sus nodos). Máximo **1** habilidad de talento por árbol (opción A de una elección).

| n | Fila | Col. | Tipo | Requiere (uno al máximo) | En la Maga: Cronomante · Invocadora · Escriba Rúnica |
|---|---|---|---|---|---|
| 0 | 0 | 1 | clave (gratis) | — | Marca del Tiempo · Familiar Arcano · Runas |
| 1 | 1 | 0 | pasiva | n0 | Reloj de Arena · Vínculo · Tinta Duradera |
| 2 | 1 | 1 | elección | n0 | Eco Mayor o Contagio · Uno o Muchos · Poder o Estallido |
| 3 | 1 | 2 | pasiva | n0 | Prisa Temporal · Imitación · Tinta de Maná |
| 4 | 2 | 0 | elección | n1 o n2 | Detener o Retroceder · Guardián o Cazador · Palabra o Guarda |
| 5 | 2 | 1 | pasiva | n2 | Segundos Robados · Sobrecarga · Caligrafía Rápida |
| 6 | 2 | 2 | pasiva | n2 o n3 | Paradoja · Detonar Constructo · Tinta Elemental |
| 7 | 3 | 0 | pasiva | n4 o n5 | Bucle · Aprendiz · Inspiración |
| 8 | 3 | 1 | elección | n5 | Presagio o Memoria · Constructo o Fragua · Glosa o Círculo |
| 9 | 3 | 2 | pasiva | n5 o n6 | Grieta Temporal · Eco Elemental · Doble Sello |
| 10 | 4 | 0,5 | pasiva | n7 o n8 | Aceleración · Constructo Templado · Concentración |
| 11 | 4 | 1,5 | pasiva | n8 o n9 | Momento Exacto · Hilo de Maná · Palimpsesto |
| 12 | 5 | 1 | **final** | n10 o n11 | Señora del Tiempo · Legión · Gran Grimorio |

(Todos de 1 rango; en los datos la columna va con punto: `c:0.5`.)

## 9. Builds y su validación punto a punto

```js
brasa: { sp:'piromante', n:'Incendio', arch:'Brasa', hero:'invoca', heroCh:{ f2:'B', f4:'A', f8:'B' },
  heroNodes:['f2','f3','f6','f5','f9','f8','f11','f12','f4','f1'],
  cls: { c1:2, c4:3, c5:1, c8:2, c11:1, c15:1, c19:1, c22:1, c2:2, c12:2, c9:1, c16:1, c18:2, c13:2, c6:1, c10:1, c25:3, c28:3, c3:2, c7:1, c14:1 },
  clsCh: { c5:'B', c6:'B', c9:'B', c10:'A', c11:'B', c14:'A', c15:'A', c16:'B', c22:'B' },
  spec: { s1:3, s4:2, s5:1, s8:1, s11:2, s15:1, s18:2, s22:3, s25:3, s28:4, s2:3, s9:1, s12:2, s16:2, s3:1 },
  specCh: { s8:'A', s9:'B', s15:'B' } },
```

| Campo | Qué es |
|---|---|
| `sp` · `n` · `arch` | Especialización, nombre de la build y arquetipo («Brasa», «Híbrido Brasa-Ignición») |
| `cls` · `spec` | Rangos por nodo **en orden de compra**. `'c4_': 2` = rangos del mismo nodo comprados más tarde (en `cls`, Nv85+; en `spec`, tras otros nodos: `'a2_': 2`). `TV2.normBuild` los suma y deja el orden en `clsOrder`/`specOrder` |
| `clsCh` · `specCh` · `heroCh` | Opción (`'A'`/`'B'`) de cada nodo de elección comprado |
| `hero` · `heroNodes` | Árbol héroe (uno de los 2 de su especialización) y sus **10** nodos en orden (sin la clave) |

**Cómo se valida (G8):** se sube del Nv1 al 100; en cada nivel, cada punto ganado (`TV2.earnedAt`) va al **primer nodo de la lista que se pueda comprar** (requisito al máximo y puerta abierta), como haría el jugador. Al Nv100 debe haber gastado **34/34** de clase y **31/31** de especialización; el Paragon debe comprar sus 10 nodos en orden legal. Por especialización: **4 builds**, al menos **una híbrida** (sin final de especialización al máximo; debe quedar a ~8–10 % de la mejor en cada escenario) y `defaultBuild`. El validador también avisa si algún final no lo usa ninguna build.

## 10. Ritmo, presupuesto y puertas (iguales para todas las clases: `TV2.REGLAS`)

| Regla | Valor |
|---|---|
| Nivel máximo | 100 |
| Especialización | Se elige al **Nv10** (clave gratis); 1 punto en los niveles pares 10–70 = **31** |
| Clase | Impares 11–69 y 85/90/95/100 = **34** |
| Paragon | 31/31 de especialización gastados → clave gratis + **10** puntos (Nv71–80); en pausa si bajas de 31 |
| Tablero de glifos | **16** puntos (Nv81–100 salvo los de clase) |
| Puertas | Clase 8 → fila 4 (Nv25), 24 → fila 7 (Nv57) · Especialización 8 → fila 4 (Nv24), 20 → fila 7 (Nv48), 25 → ápice (Nv58) |
| Finales | Clase: un final al máximo = 30 puntos (Nv69); dos = 36 > 34. Especialización: un final = 26 (Nv60), con el ápice completo 30 (Nv68); dos = 32 > 31 |
| Ningún árbol se completa | Clase 64 %, especialización 53 %, Paragon 11 de 13 nodos, tablero 20 % |

## 11. Iconos y arte

Base de las imágenes: `file:///D:/Proyectos/IntentoRPG-assets/web/` (arte crudo de Codex en `D:\Proyectos\IntentoRPG-assets`).

| Pieza | Ruta |
|---|---|
| Nodo sin `icon` | `talents/<clase>-<árbol>-<nodeId>.webp`, con `<árbol>` = `clase`, el id de la especialización o el id del árbol héroe. Ej.: `talents/guerrero-clase-c12.webp`, `talents/guerrero-berserker-b9.webp`, `talents/arquera-h2-q5.webp` |
| Nodo con `icon` | La ruta que pongas (la Maga reutiliza iconos viejos con `I('clase-c6')`) |
| Opción de una elección | `opts[].icon`; si falta, el del nodo (la B se ve en espejo) |
| Habilidad | `icon` o `icons256/<id>.webp`; variantes de forja: `forge/v_<id>_i.webp` / `_ii.webp` (si faltan, el icono base virado al color de su papel) |
| Especialización | `specs/<spec>.webp` (arte) y `emblems/<spec>.webp` (emblema) |
| Árbol héroe | `art` (p. ej. `ui256/menu_viajes.webp`) |

**Sin imagen se ve un marcador** con el id del nodo (o de la habilidad) en lugar del icono: el mockup comprueba cada imagen y no se rompe. El validador lista los iconos que faltan como aviso.

## 12. Textos (reglas del dueño)

- Verbo + efecto + **número**; «**antes X**» cuando cambia un valor («Parpadeo se recarga en 8 s (antes 12 s)»).
- **≤ 120 caracteres** por texto de efecto (cada rango; el ápice, por segmento).
- **Sin siglas ni anglicismos:** nada de `UNI`, `ÁREA×5`, `TTD`, *stagger* (es **Quebranto**), *proc*, «Gastadora» (es **Principal**). El validador los busca.
- Cada elección con su `win` («cuál conviene»): contra jefes / contra grupos / para controlar / para sobrevivir. Cada A/B viable en algún contenido.
- En la interfaz va icono + nombre corto; el detalle, en el tooltip. Los textos de las habilidades de talento dicen ranura y enfriamiento («Habilidad (ranura 2): … Se recarga en 90 s»).
- Primitivas de rol: el control no aturde a los jefes (les suma **Quebranto**); provocación con `forceTarget`; curas y escudos con objetivo `'lowest'` sobre los aliados.
- Ningún texto «por diseñar» al entregar (el validador completo lo marca como error).

## 13. Validador

```
node docs/mockups/data/validar-talentos.mjs maga                       # completa: debe pasar
node docs/mockups/data/validar-talentos.mjs guerrero --estructura      # solo formato (el esqueleto pasa)
node docs/mockups/data/validar-talentos.mjs guerrero                   # completa (al entregar)
node docs/mockups/data/validar-talentos.mjs --todas                    # todas (los esqueletos, solo formato)
node docs/mockups/data/validar-talentos.mjs maga --tablas > tablas.md  # tablas Markdown del doc, generadas de los datos
node docs/mockups/data/validar-talentos.mjs guerrero --plantilla cls                 # árbol de clase a rellenar
node docs/mockups/data/validar-talentos.mjs guerrero --plantilla spec berserker b    # árbol de especialización (prefijo b)
node docs/mockups/data/validar-talentos.mjs guerrero --plantilla hero h1 u           # árbol héroe h1 (prefijo u: que no se confunda con el id del árbol)
```

Salida: `·` información, `⚠` aviso, `✗` error; código de salida 1 si hay errores. Comprueba:

| Parte | Qué mira |
|---|---|
| Estructura | Registro e id, campos y tipos, 3 especializaciones del juego, barras existentes, catálogo (cat, elem, forja, roles), nodos (ids únicos, `c…` solo en clase, tipos, `req` del mismo árbol, `d(r)` que devuelve texto sin `undefined`/`NaN`), elecciones (2 opciones A/B con `role`), 3 árboles héroe con 2 especializaciones cada uno (cada especialización en 2), formato de builds |
| Rejillas | Clase 30/53, especialización 29/59 ×3, héroe 13 ×3: fila, columna, rangos, requisitos y tipo de cada nodo |
| Presupuesto y puertas | Ningún árbol se completa; coste mínimo de cada final y nivel en que se alcanza; dos finales no caben; final + ápice; niveles de las puertas |
| Contenido | Filas 3–9 ≥ 60 % «mecánica»; `win` en cada elección; habilidades de talento solo en la opción A, ranura 2, máx. 3 en clase y 1 por héroe, con `grantBy` correcto; kit base de 5 y 4 por especialización (forma y niveles); variantes de papel opuesto; G1 (la clase no nombra habilidades de especialización); textos ≤ 120, sin siglas ni «por diseñar»; nombres repetidos (aviso) |
| Builds | Punto a punto hasta el Nv100 (34/31, Paragon 1 + 10 en orden legal), elecciones válidas, árbol héroe permitido, 4 por especialización con una híbrida, `defaultBuild`, finales sin usar (aviso) |
| Arte | Iconos de nodos y habilidades que no existen en `IntentoRPG-assets/web` (aviso) |

## 14. Capturas

Con Chrome sin ventana (no hace falta servidor; `--virtual-time-budget` deja que la página termine de pintar):

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1366,768 --virtual-time-budget=5000 --screenshot="C:\ruta\guerrero_1366.png" "file:///D:/Proyectos/IntentoRPG/docs/mockups/skills-ux.html?cls=guerrero&view=talents&lvl=100&res=1366&shot=1"
```

Para 1920: `--window-size=1920,1080` y `&res=1920`. Entrega como mínimo, a **1366 y 1920**: talentos de las 3 especializaciones (`&spec=` o `&loadout=`), el libro de cada una (sin `view`), un hexágono abierto (`&tipnode=spec:<id>`), el Paragon en gris (`&lvl=69`), el selector (`&demo=spec`) y una híbrida con `&alt=1`. Mira cada captura antes de darla por buena.

## 15. Entrega por clase (§17.4) y trampas conocidas

1. Auditoría de la clase actual (usa `&legacy=1` para ver los talentos de hoy en el panel real).
2. Kit base y kits de especialización con forja (`catalog`).
3. Árbol de clase con su revisión por especialización.
4. Tres árboles de especialización (arquetipos, híbridos, ápice, `impl`).
5. Tres árboles héroe de la clase.
6. Cuatro builds por especialización (una híbrida), validadas punto a punto.
7. Datos en `data/talents-v2-<clase>.js`, `estado:'diseño'`, validador completo en verde y capturas a 1366 y 1920.
8. Criterios G1–G16 del doc adaptados.

**Trampas:** los ids de nodo son únicos en toda la clase y solo los de clase empiezan por `c` + número · los ids de especialización ya existen en el juego y son únicos entre clases (no los cambies) · `d` es una **función** también si no depende del rango (`d:()=>'…'`) · en una elección el texto va en `opts[].d`, no en `d` · las builds se leen en orden de inserción del objeto: el orden de las claves **es** el orden de compra · no edites `talents-v2-comun.js` ni el HTML: si una regla común no te sirve, coméntalo antes.
