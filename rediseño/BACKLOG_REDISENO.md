# Rediseño — ítems para BACKLOG_FEATURES.md

> **Cómo incorporarlo:** copiar todo lo que está debajo de la línea `=== COPIAR DESDE ACÁ ===` en
> `BACKLOG_FEATURES.md`, **justo después de la última feature `hecha` y antes de la primera
> `pendiente`** (así Claude Code los toma en orden). Las features viejas que sigan pendientes
> (PDF mensual, gastos compartidos, rendimiento real vs proyectado, alerta de aporte sin registrar,
> etc.) quedan después, y su UI deberá usar los tokens nuevos una vez hecho REDISEÑO-B0.
>
> Copiar también `REDISENO_SPEC.md` y la carpeta `mockups/` al repo (por ejemplo `docs/rediseno/`)
> o dejarlos donde Claude Code pueda leerlos, y ajustar las rutas de abajo si hace falta.

=== COPIAR DESDE ACÁ ===

---
# BLOQUE REDISEÑO

Reglas que aplican a **todos** los ítems REDISEÑO-*:

- La especificación visual está en `docs/rediseno/REDISENO_SPEC.md` y los mockups exactos en
  `docs/rediseno/mockups/` (HTML estáticos; abrirlos y leer sus estilos). **Si hay duda de medida o
  color, el mockup manda.** Leé la spec completa antes del primer ítem de estilo.
- **Orden:** primero el Bloque A (funcional, casi sin cambio visual), después el Bloque B (estilo,
  una pantalla por vez). No mezclar ítems en un mismo cambio.
- **No renombrar ids existentes** ni romper el mecanismo centralizado de modales/overlays (un solo
  overlay visible a la vez). Se cambian estructura de contenedores y clases, no ids.
- Cada ítem que toque HTML/CSS/JS **sube `CACHE_NAME` en `sw.js`** y agrega a `ASSETS_TO_CACHE`
  cualquier archivo nuevo.
- Los ítems B1–B6 se prueban **en claro y en oscuro**, en el celu real.
- Mientras REDISEÑO-B0 esté `pendiente`, la regla "Identidad visual intocable" de este documento
  sigue vigente para los ítems del Bloque A.
- Antes de escribir código, leer `index.html`, `styles.css` y los archivos de `js/` que toque el ítem,
  y decir en una línea a qué archivo de `js/` pertenece cada cambio.
- **Tokens con sufijo `-new` (desde B0):** en los ítems B1–B6 usar `var(--income-new)`,
  `var(--expense-new)` y `var(--shadow-card-new)` donde la spec diga `--income`, `--expense` o
  `--shadow-card`. Los nombres sin sufijo siguen siendo los viejos hasta B7.
- **`color-scheme` no se toca en B1–B6** (queda en `light`); se cambia recién en B7.
- Si una pantalla migrada usa una regla con `var(--font-ui)` (token que no existe), reemplazarla por
  `var(--font-sans)` en esa misma pantalla.

---
## FEATURE: REDISEÑO-A0 — Poner la documentación al día
**Estado: hecha**

### Qué se pide
Corregir documentación desactualizada para que ninguna sesión futura parta de datos viejos. Sin
cambios de código de la app.

### Comportamiento esperado
- En la regla "Modularización ya aplicada" de `BACKLOG_FEATURES.md`, la lista de archivos de `js/`
  debe coincidir con los que realmente existen (hoy faltan `suggestions.js`, `quickadd.js`,
  `transfers.js` y `plan.js`; verificarlo contra `index.html` y `sw.js`).
- En `PROMPT_FEATURES_CLAUDE_CODE.md`, reemplazar las referencias a `app.js` por la estructura real
  (`js/…`).
- No tocar todavía la regla "Identidad visual intocable" (se cambia en REDISEÑO-B0).

### Casos de borde a probar
- Que cada archivo de `js/` mencionado exista y que ninguno de los existentes falte en la lista.

### Notas de implementación
- Archivos modificados (solo documentación, sin código de la app): `BACKLOG_FEATURES.md` (regla
  "Modularización ya aplicada": ahora lista los 15 archivos de `js/`, en el orden de carga de
  `index.html`) y `PROMPT_FEATURES_CLAUDE_CODE.md` (las dos referencias a `app.js` reemplazadas por la
  estructura `js/…`).
- Verificado: los 15 archivos de `js/` existen, todos están cargados en `index.html` y todos figuran en
  ambas listas.
- Decisión propia: en `PROMPT_FEATURES_CLAUDE_CODE.md` la lista de archivos es completa (no resumida).
- Pendiente de confirmar (no tocado por pedido del ítem): `BACKLOG_FEATURES.md` paso 2 de las
  instrucciones de trabajo todavía dice "leer `index.html`, `styles.css` y `app.js`".
- Hallazgo fuera de alcance (no tocado, A0 no cambia código): `js/plan.js` se carga en `index.html`
  pero **no está en `ASSETS_TO_CACHE` de `sw.js`**, así que la pestaña Plan no funcionaría offline.

---
## FEATURE: REDISEÑO-A1 — "Tenés ahora" como saldo principal y cuentas con saldo
**Estado: hecha**
**Depende de:** REDISEÑO-A0

### Qué se pide
Hoy el Inicio muestra primero el "saldo del mes" (`#month-balance`) y debajo "tenés ahora (todas las
cuentas)" (`#total-balance`). Se invierte la jerarquía: lo que se tiene hoy es lo principal y el
resultado del mes es información secundaria. Además, el desglose por cuenta debe mostrar solo
las cuentas que tienen dinero.

### Comportamiento esperado
- `#total-balance` (suma de `getAccountBalance()` de todas las cuentas, sin depender del mes
  visualizado) pasa a ser el número principal de la tarjeta de resumen, con la etiqueta
  "tenés ahora (todas las cuentas)".
- `#month-balance` ("saldo del mes"), `#month-income` y `#month-expense` pasan a un bloque secundario
  más chico en la misma tarjeta (los tres con etiqueta, en una sola fila). Sigue dependiendo de
  `viewDate` y de la navegación de mes, y su fórmula no cambia
  (`income − expense + adjNet`, sin entries `pending`).
- `renderAccountBreakdown()`: mostrar solo las cuentas con `Math.round(getAccountBalance(id)) !== 0`
  (un saldo negativo cuenta como distinto de cero y mantiene el estilo `negative`).
  El contenedor se muestra solo si hay **2 o más** cuentas con saldo; con 0 o 1 queda oculto.
- El botón `#btn-open-transfer` hoy comparte la condición del desglose. Separarlas: el botón se
  muestra siempre que existan **2 o más cuentas en total** (aunque alguna tenga saldo 0, porque se
  puede transferir hacia una cuenta vacía).
- Ajustes > Cuentas (`renderAccountManager`) sigue listando **todas** las cuentas.
- Verificar (y dejar anotado) que `getAccountBalance()` **no** suma entries `pending: true`
  (fijos autogenerados cuyo día todavía no llegó). Si el filtro por fecha ya los excluye, no tocar
  nada; si no, excluirlos para que "tenés ahora" no descuente gastos futuros.
- Cambios visuales mínimos: reordenar el DOM y ajustar tamaños con las clases existentes. El
  estilo final se hace en REDISEÑO-B1.

### Casos de borde a probar
- Una sola cuenta con dinero entre varias: sin desglose, con botón de transferir visible.
- Cuenta con saldo 0 que luego recibe una transferencia: aparece en el desglose al recalcular.
- Cuenta con saldo negativo: se muestra con el estilo de negativo.
- Navegar a otro mes: "tenés ahora" no cambia; el saldo del mes sí.
- Un gasto fijo con día posterior a hoy (`pending`): no modifica "tenés ahora".

### Notas de implementación
- Archivos modificados: `index.html` (reorden del DOM de `.summary-card`), `styles.css`,
  `js/ledger.js` (`renderAccountBreakdown`), `sw.js`, `BACKLOG_FEATURES.md`. Ningún id renombrado.
- DOM de la tarjeta: navegación de mes → `#total-balance` (reusa las clases grandes
  `.summary-balance-*`, etiqueta "tenés ahora (todas las cuentas)") → `#account-breakdown` →
  `#btn-open-transfer` → fila de 3 columnas (`#month-income`, `#month-expense`, `#month-balance`
  con etiqueta "saldo del mes"). `renderSummary()` y `renderTotalBalance()` no se tocaron: sus
  fórmulas y el toggle de `negative` siguen igual.
- CSS: se borraron las reglas huérfanas `.summary-total*`; `.split-amount` bajó de 15 a 13 px para que
  entren 3 columnas; se agregó `.split-balance` (color neutro, `negative` en rojo) y `margin-top` a
  `.summary-split`.
- `renderAccountBreakdown()`: botón de transferir visible si hay 2+ cuentas en total; desglose solo con
  cuentas cuyo `Math.round(saldo) !== 0`, y solo si hay 2+. Probada la condición con casos simulados
  (`[100,0,0]`, `[100,50]`, `[0,0]`, `[100]`, `[-30,0]`, `[0.4,200]`, 5 cuentas con saldo).
- Verificado: `getAccountBalance()` excluye `pending: true` (`!e.pending` en `js/state.js`), no hizo
  falta tocarlo. Ajustes > Cuentas sigue listando todas.
- `sw.js`: verificados los 15 archivos de `js/` cargados en `index.html` contra `ASSETS_TO_CACHE`; el
  único faltante era `js/plan.js`, ya agregado. `CACHE_NAME` v23 → v24.
- `BACKLOG_FEATURES.md`: paso 2 de las instrucciones ya no menciona `app.js`.
- Decisión propia: una cuenta con saldo entre -0,5 y 0,5 cuenta como "sin saldo" por el redondeo.
- Caso a mirar en el celu: con una cuenta negativa y otra positiva el desglose aparece (2 cuentas con
  saldo distinto de cero).

---
## FEATURE: REDISEÑO-A2 — Saldo del mes en Reportes
**Estado: hecha**
**Depende de:** REDISEÑO-A1

### Qué se pide
Mostrar el saldo del mes arriba de la vista de Reportes (`view-stats`), para el mismo mes que esa
vista ya usa.

### Comportamiento esperado
- Extraer la fórmula del saldo mensual de `renderSummary()` a una función reutilizable
  (por ejemplo `getMonthSummary(date)` que devuelva `{ income, expense, adjNet, balance }`), en
  `js/ledger.js` (se carga antes que `stats.js`). `renderSummary()` pasa a usarla; no debe cambiar
  su resultado.
- En `view-stats`, antes de la grilla de métricas, agregar un bloque con `id="stats-month-balance"`
  (saldo del mes) y los totales de ingresos y gastos del mismo mes, calculados con la función
  extraída. Se actualiza dentro de `renderStats()`.
- Estilo provisorio simple con las clases existentes; el estilo final se hace en REDISEÑO-B2.

### Casos de borde a probar
- Mes sin movimientos: todo en `$ 0`, sin errores.
- Mes con ajustes de saldo (`adjustment`): incluidos igual que en el Inicio.
- Entries `pending` excluidos igual que en el Inicio.
- El valor de Reportes coincide con el del Inicio para el mismo mes.

### Notas de implementación
- Archivos modificados: `js/ledger.js` (nueva `getMonthSummary(date)` → `{ income, expense, adjNet,
  balance }`; `renderSummary()` pasa a usarla, misma fórmula y mismo filtro de `pending`),
  `js/stats.js` (`renderStats()` llena el bloque nuevo), `index.html`, `sw.js` (`CACHE_NAME` v24 → v25).
- Bloque nuevo en `view-stats`, antes de `.metric-grid`: `#stats-month-balance`, `#stats-month-income`,
  `#stats-month-expense`. Estilo provisorio reusando `.summary-card`, `.summary-balance-*` y
  `.summary-split` (sin CSS nuevo); el estilo final va en B2. El saldo negativo usa la clase `negative`.
- Decisión propia: Reportes sigue usando el mes actual (`new Date()`), igual que el resto de
  `renderStats()`; el Inicio usa `viewDate`. Coinciden solo mientras el Inicio esté en el mes actual.
- Probada `getMonthSummary()` con datos simulados: ingreso, gasto, ajuste negativo, un gasto
  `pending` (excluido) y un movimiento de otro mes (excluido) → `{1000, 300, -50, 650}`; mes sin
  movimientos → todo en 0.

---
## FEATURE: REDISEÑO-A3 — Accesos directos Gasto / Ingreso / Carga rápida en el Inicio
**Estado: hecha**
**Depende de:** REDISEÑO-A2

### Qué se pide
En el Inicio, entre la tarjeta del mes y el banner de sugerencias, agregar una fila de accesos directos: Gasto, Ingreso y Carga rápida. Gasto e Ingreso abren la hoja de carga de movimiento de hoy con el tipo ya elegido. Reemplazan a los botones flotantes (+ y ⚡).

### Comportamiento esperado
- `openAddModal()` acepta un tipo opcional (`'expense' | 'income'`); sin argumento se comporta como hoy. Con tipo, deja elegido el toggle de tipo y las categorías de ese tipo. Leé cómo `setEntryType()` maneja `selectedCategoryId` y reusá esa lógica, sin duplicarla.
- Nueva fila en `index.html` con tres `<button>`: `#btn-add-expense`, `#btn-add-income` y `#btn-quick-add` (el ⚡ conserva su id y su listener; solo se mueve de lugar). Cada uno con ícono y etiqueta visible ("Gasto", "Ingreso", "Carga rápida") y área táctil de al menos 44 px.
- Quitar el botón flotante `#btn-add`. Migrar todas sus referencias (listener en `main.js`, CSS, textos). El texto de `#empty-state` pasa a "tocá Gasto o Ingreso para cargar tu primer movimiento".
- Estilo provisorio simple con clases existentes; el estilo final se hace en REDISEÑO-B1.

### Casos de borde a probar
- Gasto → guardar: se crea un gasto. Ingreso → guardar: se crea un ingreso con categorías de ingreso.
- Abrir con Ingreso, cancelar, abrir con Gasto: no quedan el tipo ni la categoría anteriores.
- Editar un movimiento existente (`openEditModal`) y la carga rápida siguen funcionando.
- El botón atrás del celu cierra la hoja y nunca quedan dos overlays abiertos.

### Notas de implementación
- Archivos modificados: `js/ledger.js` (`openAddModal(type)`), `js/main.js` (listeners), `index.html`
  (fila `.quick-actions`, FAB borrados, texto de `#empty-state`), `styles.css`, `sw.js`
  (`CACHE_NAME` v25 → v26). `index.html` ya no tiene `#btn-add`; `#btn-quick-add` conserva id y listener
  (`openQuickAddModal`) y solo cambió de lugar.
- `openAddModal(type)`: acepta `'expense' | 'income'`; cualquier otro valor, o ninguno, abre en gasto.
  En vez de duplicar el reseteo, delega en `setEntryType()` (deja el toggle, limpia categoría,
  subcategoría y sugerencia, y renderiza las categorías del tipo). Se borraron del cuerpo las líneas
  redundantes que ya hacía `setEntryType`.
- Los listeners de Gasto e Ingreso son arrow functions (`() => openAddModal('income')`) para que el
  evento del click no llegue como `type`. `openAddModal` no tiene otros llamadores.
- CSS: nueva sección "ACCESOS DIRECTOS" con grilla de 3 columnas, círculo de 56 px y etiqueta de 12 px,
  solo con tokens existentes (flecha ↗ en `--expense`, ↙ en `--income`). Se borraron `.fab` y `.fab-quick`.
  El estilo final queda para B1.
- Probado con una simulación de `openAddModal`: Ingreso → tipo y toggle de ingreso con categoría,
  subcategoría, sugerencia y edición limpias; luego Gasto sin arrastrar la categoría anterior; sin
  argumento y con un evento como argumento → gasto.
- El `+` que menciona `js/plan.js` ("usá el botón + para agregar uno") es el botón del encabezado de
  Plan, no el FAB: no se tocó.
- Sin probar en navegador real: la fila, el botón atrás y que no queden dos overlays.

---
## FEATURE: REDISEÑO-B0 — Tokens, tipografía y tema claro/oscuro
**Estado: hecha**
**Depende de:** REDISEÑO-A3

### Qué se pide
Montar la base del rediseño sin cambiar todavía el diseño de ninguna pantalla: tokens nuevos, fuente
nueva, mecanismo de tema claro/oscuro y la opción en Ajustes. Seguir `REDISENO_SPEC.md` secciones 2, 3, 7 y 8.

### Comportamiento esperado
- Agregar al `:root` todos los tokens de la tabla 2.2 de la spec (tema claro) y los mismos
  nombres con valores oscuros en `:root[data-theme="dark"]` y en
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }`.
  Los tokens viejos (`--paper`, `--ink`, `--accent`, etc.) **se mantienen** sin cambios hasta B7.
- No usar el nombre `--accent` para el color nuevo: el resaltado nuevo es `--highlight`.
- Cargar Plus Jakarta Sans (400–800) en `index.html`; definir el token de fuente nuevo. Revisar
  con `grep` el uso de `var(--font-ui)` (no está definido en `:root`) y registrar qué se hizo.
  Por ahora la fuente nueva solo se declara; cada pantalla la adopta al migrarse.
- `state.settings.theme` (`'auto' | 'light' | 'dark'`, default `'auto'`) con default en
  `loadState()`, `clearAllData()` e importación de datos.
- Aplicar el tema al abrir sin destello: script mínimo inline en `<head>` que lee
  `localStorage['libro-caja-data-v1']` y setea `document.documentElement.dataset.theme`
  (en `auto` no setea nada y manda el `@media`). Más una función `applyTheme()` en `js/settings.js`.
- Ajustes: sección "Apariencia" con control segmentado Claro / Oscuro / Automático
  (`#theme-selector`), con el estilo de `Real-L-5-ajustes`. Al cambiar, guarda, aplica el tema
  y actualiza `<meta name="theme-color">` (variantes claro/oscuro con `media` + actualización dinámica).
- `manifest.json`: `theme_color` y `background_color` → `#EEF2EC`.
- Actualizar en `BACKLOG_FEATURES.md` y `PROMPT_FEATURES_CLAUDE_CODE.md` la regla "Identidad visual
  intocable" para que apunte a `REDISENO_SPEC.md` (nuevo estilo "E": verde, Plus Jakarta Sans,
  tokens semánticos, claro y oscuro).
- Subir `CACHE_NAME`.

### Casos de borde a probar
- Instalación existente (sin `settings.theme`): arranca en `auto` y no pierde datos.
- Sistema operativo en oscuro + preferencia `auto`: la app abre oscura; con `light`, abre clara.
- Cambiar el tema desde Ajustes se aplica al instante, sin recargar, y persiste al reabrir.
- Importar un JSON de backup viejo: no rompe y deja `theme: 'auto'`.
- Las pantallas todavía con el diseño viejo siguen viéndose igual que antes en claro.

### Notas de implementación
- Archivos modificados: `styles.css`, `index.html`, `manifest.json`, `js/state.js`, `js/settings.js`,
  `js/main.js`, `sw.js` (`CACHE_NAME` v26 → v27), `BACKLOG_FEATURES.md` y `PROMPT_FEATURES_CLAUDE_CODE.md`
  (regla "Identidad visual" ahora apunta a `REDISENO_SPEC.md`).
- **Colisión de nombres (decisión propia, a confirmar):** la spec define `--income`, `--expense` y
  `--shadow-card`, pero `:root` ya los tiene con otro valor y todas las pantallas viejas los usan.
  Redefinirlos cambiaría las pantallas viejas (y en oscuro los gastos quedarían ilegibles sobre
  crema). Se agregaron con sufijo: `--income-new`, `--expense-new`, `--shadow-card-new`. Las pantallas
  de B1–B6 usan esos nombres; en B7 se borran los viejos y se renombran. Los otros 36 tokens de la
  tabla 2.2 se agregaron con el nombre exacto de la spec.
- Tokens: los 39 nuevos están en `:root` (claro), en `:root[data-theme="dark"]` y en
  `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` (los dos bloques oscuros
  están duplicados a mano: CSS no permite compartirlos). Verificado por script que los tres bloques
  tienen exactamente los mismos nombres y que los tokens viejos conservan su valor.
- Fuente: Plus Jakarta Sans 400–800 agregada a la URL de Google Fonts existente (las fuentes viejas se
  siguen cargando porque las pantallas viejas las usan) y token `--font-sans`. Nadie lo usa todavía.
- `var(--font-ui)`: se usa en 5 reglas (`.dollar-type-chip`, `.dollar-rate-status`,
  `.subcat-toggle-btn`, `.transfer-trigger-btn` y `.entry-icon.transfer`) y **no está definido**, así que
  esas declaraciones son inválidas: `font-family` hereda la fuente del cuerpo y los dos `font:` abreviados
  (`.dollar-type-chip`, `.dollar-rate-status`) se ignoran por completo. No se tocó para no cambiar
  el aspecto de pantallas viejas; se corrige (con `--font-sans`) cuando cada una migre.
- Tema: `state.settings = { theme: 'auto' | 'light' | 'dark' }` con default en el estado inicial,
  `loadState()` (normaliza si falta o es inválido), importación (un backup sin `settings` o con un
  valor inválido queda en `auto`; uno con `light`/`dark` lo conserva) y `clearAllData()` (vuelve a `auto`).
  Script inline en `<head>` que lee `localStorage['libro-caja-data-v1']` y fija `data-theme` antes del
  primer pintado. `applyTheme()`, `renderThemeSelector()` y `setTheme()` están en `js/settings.js`;
  `applyTheme()` corre en `init()` y tras importar o borrar datos.
- `<meta name="theme-color">`: dos metas con `media` claro/oscuro. Al elegir Claro u Oscuro, `applyTheme()`
  fuerza las dos al mismo color; en Automático vuelven a su valor por media. `manifest.json` →
  `#EEF2EC` en `theme_color` y `background_color`.
- Ajustes > "apariencia" (`#theme-selector`, tres botones con `aria-pressed`) entre inflación/umbrales y
  datos; estilo del mockup `Real-L-5-ajustes` con tokens (alto 44, píldora, opción activa
  `--seg-selected-*`).
- `color-scheme` (decisión propia): se dejó en `light`. Las pantallas viejas son claras en cualquier
  tema, y `color-scheme: dark` oscurecería controles nativos sobre fondo crema. Debe pasar a seguir el
  tema cuando migre la primera pantalla (B1).
- Efecto visible esperado en oscuro hasta B1: solo el selector de tema cambia; el resto de la app se ve
  igual que en claro. La barra de estado del celu sí cambia de color (`theme-color`).
- Probado con simulación (Node): alternar entre claro, oscuro, automático y un valor inválido
  (data-theme y metas correctos, guardado una vez por cambio); normalización de `settings` ausente,
  vacío, inválido y válido.
- Sin probar en navegador real: destello al abrir, SO en oscuro con `auto`, y cambio al instante.

---
## FEATURE: REDISEÑO-B1 — Inicio (libro)
**Estado: hecha**
**Depende de:** REDISEÑO-B0

### Qué se pide
Aplicar el diseño nuevo al Inicio, en claro y en oscuro. Referencia: `Real-L-1-inicio` y
`Real-D-1-inicio`. Es también el momento de migrar la **barra inferior** y la **fila de accesos directos**
(componentes globales, ver spec sección 4), que quedan para el resto de la app.

### Comportamiento esperado
- Barra superior: navegación de mes (`#prev-month`, `#current-month-label`, `#next-month`) como píldora
  a la izquierda; la racha (`#streak-bar` y sus ids internos) como chip a la derecha, con el
  texto "N días". Debe seguir abriendo el calendario al tocarla y comunicar si "hoy" está pendiente
  (por ejemplo con un indicador y en el `aria-label`, no solo con color).
- Tarjeta hero (verde): "tenés ahora" + `#total-balance`, desglose de cuentas con su emoji,
  y el botón "Transferir entre cuentas" (`#btn-open-transfer`) dentro de la misma tarjeta.
- Tarjeta chica: ingresos del mes, gastos del mes y saldo del mes en una fila de 3 columnas.
- Banner de sugerencias (`#suggestion-banner`) con los tokens `--banner-*`.
- Movimientos: título + control segmentado de filtro (`#filter-pills` conserva `data-filter` y
  la lógica); filas nuevas (avatar con tinte, título, subtítulo, monto) para entries, transferencias (↔),
  ajustes (⚖️) y pendientes (opacidad .6 + tag "pendiente"); etiquetas de día.
- Fila de accesos directos (Gasto, Ingreso, Carga rápida) entre la tarjeta del mes y el banner, según el mockup; barra inferior flotante con 5 pestañas.
- `padding-bottom` del contenido ≥ 110 px para que nada quede tapado.
- Sin colores ni medidas hardcodeadas: solo tokens.
- Usar `--income-new`, `--expense-new` y `--shadow-card-new`. NO cambiar `color-scheme` en este ítem (queda en `light` hasta B7). Si una regla migrada usa `var(--font-ui)`, reemplazala por el token de fuente nuevo.

### Casos de borde a probar
- Sin movimientos en el mes (`#empty-state`), con 1 sola cuenta, con 5 o más cuentas con saldo.
- Montos grandes (por ejemplo `$ 12.345.678`) sin romper el ancho de la tarjeta hero ni de las filas.
- Textos largos de nota/categoría: truncan con puntos suspensivos, no rompen la fila.
- Cambiar de claro a oscuro con la pantalla abierta.
- Pantalla angosta (320 px) y celu con barra de gestos.
- Que la barra inferior no tape el último movimiento (se puede scrollear por debajo).

### Notas de implementación
- Archivos modificados: `index.html`, `styles.css`, `js/ledger.js`, `js/main.js`, `sw.js` (`CACHE_NAME`
  v27 → v28). Ningún id existente se renombró (verificado por script: todo `getElementById` del JS
  existe en `index.html`). Agregué un id nuevo: `#streak-unit` ("día"/"días").
- **Verificación contra los mockups** (`Real-L-1-inicio` y `Real-D-1-inicio`): corrí la app en un
  navegador real a 390 px con datos de ejemplo y medí con JS: barra de mes y chip de racha 44 px,
  hero radio 28 con monto 42/800, filas de cuenta 40 px, botón de transferir 48 px, tarjeta del mes
  radio 22, círculos 56 px con ícono 22, avatares 38 px, barra inferior 68 px (radio 34, ítems 64×54);
  capturas en claro y oscuro. Sin colores ni medidas de color hardcodeadas en el CSS nuevo (revisado por
  script) y sin tokens viejos en las secciones reescritas. No probado en un celu real.
- **Encabezado eliminado:** el mockup no tiene el título "Libro de caja" ni el botón de Reportes de la
  barra superior, así que se sacó ese `<header>` (con `#btn-open-stats`) y su listener en `main.js`.
  Reportes sigue accesible desde la barra inferior.
- Barra superior: mes en píldora (`#prev-month`, `#current-month-label`, `#next-month`; el texto se
  capitaliza por CSS) y racha como chip (`#streak-bar` ahora es un `<button>`; `#streak-count`,
  `#streak-flame`, `#streak-today-badge` conservados). Hoy pendiente/anotado: aro vacío / tilde en el
  chip, y texto completo en el `aria-label` (no depende del color).
- Hero: "Tenés ahora" + `#total-balance`, cuentas con emoji, y `#btn-open-transfer` dentro de la
  tarjeta. Con una sola cuenta con saldo el desglose se oculta y el padding inferior del hero pasa de 4 a
  20 px (clase `has-extras`, la pone `renderAccountBreakdown`). Tarjeta chica: ingresos / gastos / saldo
  del mes; el saldo lleva signo (`+$ …` / `−$ …`, función `formatSignedMoney` en `ledger.js`).
- Movimientos: título del renglón = la nota si hay (si no, la categoría); el subtítulo suma la categoría
  (cuando no es el título), subcategoría, cuenta (solo con 2+ cuentas) y "gasto fijo" / "ingreso fijo" /
  "cuota" (reemplaza al ↻). Pendientes: opacidad .6 + tag "pendiente". Ajustes y transferencias: avatar y
  monto neutros; el ajuste muestra "Cuenta X" y conserva el signo. El filtro (`.pill`) ahora actualiza
  también `aria-pressed`.
- Etiquetas de día: función nueva `formatLedgerDayLabel` ("Hoy · vie 2", "Ayer · jue 1", "Mié 30"; el
  mayúsculas es CSS) y sufijo " · pendiente" si todos los renglones del grupo son pendientes. `formatDayLabel`
  no se tocó porque la usa `goals.js`.
- Barra inferior flotante (68 px, radio 34, `left/right` 20 px, máximo 440 px de ancho) con el ícono de
  Ajustes del mockup (sliders) y etiquetas con mayúscula. Decisión propia: `bottom: max(16px,
  env(safe-area-inset-bottom))` para no chocar con la barra de gestos de iOS. `body` tiene
  `padding-bottom: 110px` + safe-area; el toast subió para quedar sobre la barra.
- Accesos directos: iconos y tamaños del mockup; en oscuro el círculo lleva borde `--line` (regla
  duplicada para `[data-theme="dark"]` y para el `@media`, igual que los tokens).
- Convivencia con pantallas viejas: `html/body` usan `--bg` pero conservan el color de texto viejo (las
  pantallas viejas lo heredan); `#app` y `.bottom-nav` usan `--text` y `--font-sans`. Se conservaron las
  reglas `.summary-card`, `.summary-balance*`, `.summary-split` y `.split-*` porque el bloque de Reportes
  (A2) las usa; se borran en B2. Borrado como huérfano: `.top-bar*`, `.ledger-mark`, `.streak-bar*`,
  `.summary-row`, `.summary-month*`, `.nav-arrow`, y las reglas viejas de `.fab`/`.transfer-trigger-btn`.
- `var(--font-ui)`: se eliminó con las reglas de `.entry-icon.transfer` y `.transfer-trigger-btn`
  (migradas). Quedan 3 referencias en pantallas no migradas (`.dollar-type-chip`, `.dollar-rate-status`,
  `.subcat-toggle-btn`).
- Probado en navegador a 390 y 320 px (y, tras la revisión, la pestaña Pendientes y el saldo negativo): monto de $ 13.387.678 (el monto del hero baja a 34,5 px a 320 px y
  no desborda), nota larga (se trunca con "…"), estado vacío, una cuenta, saldo negativo, filtro, mes
  anterior/siguiente, racha, Gasto/Ingreso/Carga rápida, y que no queden overlays abiertos.
- **Decisiones tras la revisión de B1:**
  1. *Pendientes:* el filtro del Inicio tiene una cuarta pestaña "Pendientes" (`data-filter="pending"`) que
     lista solo los movimientos sin confirmar del mes visible (gastos e ingresos fijos y cuotas). Siguen
     apareciendo también en "Todos", "Ingresos" y "Gastos" (por tipo), con su tag "pendiente". Con la pestaña
     vacía el estado vacío dice "No tenés movimientos pendientes". En pantallas de menos de 360 px las
     pestañas pasan a 2 × 2 para que "Pendientes" no se corte. Al confirmar un pago con "pagar", el
     movimiento sale de la pestaña. Limitación: es por mes visible; un pendiente de un mes anterior solo se
     ve al navegar a ese mes.
  2. *Saldo negativo sobre el hero:* se pinta en rojo, además del signo "-" (no solo color). Token nuevo
     `--hero-negative` (`#FF9A73`, igual en los dos temas porque la tarjeta hero es la misma en claro y
     oscuro; contraste ≈ 5,6:1 sobre `--hero`). Se aplica al "Tenés ahora", a las cuentas del desglose y al
     "Saldo del mes" de Reportes (`.report-hero-amount.negative`). Agregado también a la tabla 2.2 de la spec.
  3. *Título del renglón = nota, categoría en el subtítulo:* confirmado.
- Limitación conocida: con las pantallas viejas todavía sin migrar, los modales (hojas crema) se ven
  claros incluso con el Inicio en oscuro, hasta B6.

---
## FEATURE: REDISEÑO-B2 — Reportes
**Estado: hecha**
**Depende de:** REDISEÑO-B1

### Qué se pide
Aplicar el diseño nuevo a `view-stats`. Referencia: `Real-L-2-reportes` / `Real-D-2-reportes`.

### Comportamiento esperado
- Encabezado de vista con botón volver, título y navegación de mes con el patrón del mockup.
- Hero "Saldo del mes" (`#stats-month-balance`, de REDISEÑO-A2) con mosaicos de ingresos y gastos.
- Métricas (`#metric-*`) en grilla de 2 columnas; la de gastos hormiga ocupa el ancho completo.
- "Gastos por categoría" con emoji, monto, porcentaje del gasto y barra de presupuesto con `--warn`
  y texto "casi al límite" desde el 90 %; secciones "Ahorros" y "Ajustes de saldo" separadas.
- "Últimos 6 meses" (`#trend-chart`): barras con el mes actual resaltado con `--bar-fill`.
- "Gastos hormiga por categoría" con barras.
- Todo con tokens; sin estilos viejos huérfanos para estas clases.

### Casos de borde a probar
- Mes sin datos (métricas en "—", barras vacías, sin errores).
- Categoría sin presupuesto (sin barra), con presupuesto superado (>100 %: la barra no se desborda).
- Subcategorías (`.subcat-*`) siguen funcionando y se ven bien en ambos temas.
- Lectura en oscuro de todas las barras y del gráfico.

### Notas de implementación
- Archivos modificados: `index.html` (todo `view-stats`), `styles.css`, `js/stats.js`, `sw.js`
  (`CACHE_NAME` v28 → v30). Ningún id existente se renombró (verificado por script). Ids nuevos:
  `#metric-vs-last-sub`, `#metric-real-var-sub`, `#savings-card`, `#savings-bars`, `#ants-card`.
- **Verificación contra `Real-L-2-reportes` / `Real-D-2-reportes`:** corrí la app en un navegador real a
  390 px con datos de ejemplo (presupuestos al 52 %, 77 % y 127 %, ahorro, ajuste, gastos hormiga y 6 meses
  de historia) y medí con JS: botón volver 44 px, título 18/700, hero con monto 36/800 y mosaicos de 16 px
  de radio, tarjetas de métrica de radio 22 con valor 20/800, alturas de las barras del gráfico (96, 109,
  112, 103, 118 px frente a 96, 109, 113, 104, 118 del mockup); capturas en claro y oscuro. Sin colores
  fijos ni tokens viejos en el CSS nuevo (revisado por script). No probado en un celu real.
- Encabezado: botón volver circular (`#stats-back`), título "Reportes" y fila del mes. Hero "Saldo del mes"
  (`#stats-month-balance`, con signo) y mosaicos de Ingresos y Gastos. Métricas en grilla de 2 columnas, con
  las líneas secundarias del mockup ("gastaste menos/más/igual", "ajustado por inflación", "a este ritmo",
  "N gastos chicos"); los porcentajes ahora llevan espacio y signo "−" ("−6 %", "58 %", `formatPercent` en
  `stats.js`) y "Días anotados" se muestra como "12 / 31". Gastos hormiga ocupa el ancho completo.
- Gastos por categoría: cada fila muestra emoji, monto, "N % del gasto" y, solo si hay presupuesto, la barra
  de avance contra el presupuesto con "de $ X de presupuesto". Desde el 90 % la barra y el porcentaje pasan a
  `--warn` y el texto dice "casi al límite"; arriba del 100 % la barra queda llena (no se desborda) y el texto
  dice "superaste el límite (+N %)". Sin presupuesto no hay barra.
- "Ahorros" y "Ajustes de saldo" salieron de la lista de categorías y van en una tarjeta propia
  (`#savings-card`), sin barras, como en el mockup; la tarjeta se oculta si no hay ninguno de los dos.
- "Últimos 6 meses": barras de gasto con el valor en miles ("520k") arriba y el mes abajo; el mes actual con
  `--bar-fill`, los demás con `--track`; altura máxima 118 px. Gastos hormiga por categoría: tarjeta propia
  (`#ants-card`, se oculta si no hay), filas con porcentaje y barra.
- Subcategorías (`.subcat-*`): mismos nombres de clase, ahora con tokens; el botón "ver por subcategoría"
  mide 44 px de alto. Se reemplazaron los estilos inline que usaban `var(--ink-faint)` por la clase
  `.subcat-muted`. Verificado el desplegable.
- Limpieza: se borraron `.summary-card`, `.summary-balance*`, `.summary-split`, `.split-*` (los usaba el bloque
  provisorio de A2 y el Inicio de antes de B1), `.stats-month-label`, `.savings-section-label`,
  `.budget-overflow` y los estilos viejos del gráfico y las métricas. `.section-label` y `.budget-limit-tag`
  se conservan porque Ajustes, Metas y presupuestos los usan. Se sacó `var(--font-ui)` de
  `.subcat-toggle-btn` (quedan 2 referencias en pantallas no migradas: `.dollar-type-chip` y
  `.dollar-rate-status`).
- **Decisiones tras la primera revisión** (el mockup es referencia: no se pierde funcionalidad que la app ya tenía):
  1. *Navegación de mes en Reportes:* se agregaron las flechas del mockup (`#stats-prev-month`,
     `#stats-next-month`). Antes Reportes solo mostraba el mes actual, así que el reporte del mes anterior no
     existía. Ahora todo se calcula para el mes elegido (`statsViewDate`, `shiftStatsMonth()` en `stats.js`): en
     un mes cerrado el promedio diario usa todos sus días, "Proyección" muestra "—" con "mes cerrado", y el
     gráfico termina en ese mes. No se puede avanzar más allá del mes actual; al abrir Reportes siempre empieza
     en el mes actual (`resetStatsMonth()` desde `showView`).
  2. *Gráfico de 6 meses:* se conserva el estilo del mockup, pero con un selector Gastos / Ingresos
     (`#trend-mode`) para no perder las barras de ingresos que la app ya tenía. Control segmentado nuevo
     `.seg-control` / `.seg-btn`, con el mismo aspecto que el filtro del Inicio.
  3. *Datos que el mockup omitía y se restituyeron:* "N mov." en gastos hormiga por categoría, "% usado" del
     presupuesto, "% de lo que salió" en Ahorros y "diferencia no identificada" en el renglón del ajuste de saldo
     del Inicio (`js/ledger.js`).
  4. *Barra inferior en todas las pantallas:* `.bottom-nav` pasó a `z-index: 60` (sobre las pantallas, `.view-overlay`
     = 50, y bajo los modales, 100) y `.view-overlay` tiene `padding-bottom` de 110 px + safe-area para que no
     tape contenido. Sirve para ir de una pantalla a otra sin pasar por el Inicio; el botón volver sigue. Al
     cambiar de pestaña con una pantalla abierta no se apila otra entrada de historial (`replaceState`), y
     `showView` también cierra el calendario de racha. Sobre el calendario de racha la barra marca "Libro".
     Las pantallas aún no migradas (Metas, Plan, Ajustes) quedan con su estilo viejo debajo de la barra nueva.
- Casos de borde probados: mes sin datos (métricas en "—", barras de 4 px, mensaje "No hay gastos en este mes",
  tarjetas de ahorro y hormiga ocultas), categoría con presupuesto superado, categoría sin presupuesto,
  subcategorías, lectura en oscuro, mes anterior / dos meses atrás / tope en el mes actual, selector del gráfico,
  recorrido de todas las pantallas con la barra inferior (una sola abierta a la vez) y barra por encima del contenido.
- `CACHE_NAME` queda en v30.

---
## FEATURE: REDISEÑO-B3 — Metas y ahorro en dólares
**Estado: hecha**
**Depende de:** REDISEÑO-B2

### Qué se pide
Aplicar el diseño nuevo a `view-goals`. Referencia: `Real-L-3-metas` / `Real-D-3-metas`.

### Comportamiento esperado
- Tarjeta por meta: nombre, badge ARS/USD, botón de editar (44 × 44), monto actual y objetivo en su
  propia moneda (`formatGoalAmount`), barra, "% logrado" y botón "Sumar". Las metas en USD muestran
  `≈ $ … (ref.)` con el último tipo de cambio.
- Sección "Ahorro en dólares": total en USD, equivalente en pesos al último tipo de cambio (rotulado
  como referencia), lista de depósitos y botón "+ Depositar".
- Estado vacío (sin metas) con el estilo nuevo.

### Casos de borde a probar
- Meta al 100 % o por encima; meta con objetivo 0.
- Sin tipo de cambio disponible (se omite la referencia en pesos sin romper).
- Sin depósitos de USD.
- Nunca mezclar `$` y `USD` sin rotular.

### Notas de implementación
- Archivos modificados: `index.html` (`view-goals`), `styles.css`, `js/goals.js`, `js/plan.js` (solo un
  renombre, ver abajo), `sw.js` (`CACHE_NAME` v31 → v32). Ningún id existente se renombró (`#goals-back`,
  `#btn-add-goal`, `#goals-body`, y las clases `.btn-add-fund` / `.goal-edit-btn` con su `data-goal-id`
  se conservan). Id nuevo: `#btn-open-dollar` (botón "+ Depositar").
- **Verificación contra `Real-L-3-metas` / `Real-D-3-metas`:** corrí la app en un navegador real a 390 px con
  metas en pesos y en dólares y depósitos de ejemplo; medí con JS: botones volver, nueva meta y editar de
  44 × 44, "Sumar" y "+ Depositar" de 44 px de alto, barra de 12 px, tarjeta de radio 28, monto de meta
  24/800, total en dólares 30/800 y avatares de 38 px; capturas en claro y oscuro. Sin colores fijos ni
  tokens viejos en el CSS nuevo (revisado por script). No probado en un celu real.
- Encabezado compartido: las clases `report-header`, `report-back` y `report-body` pasaron a `screen-header`,
  `screen-back` y `screen-body` (ahora las usan Reportes y Metas), y se agregó `.screen-add` (botón + circular
  de 44 px con `--primary`). `view-goals` lleva la clase `themed`.
- Tarjeta de meta: nombre, badge ARS (`--neutral-tint`) o USD (`--highlight`), lápiz de 44 × 44 con
  `aria-label="Editar meta <nombre>"` (reemplaza al emoji ✏️), monto actual y "de <objetivo>" en la moneda de la
  meta (`formatGoalAmount`), barra con `role="progressbar"`, "N % logrado" y botón "Sumar". Las metas en USD
  muestran "≈ $ … (ref.)" con el último tipo de cambio y se omite si no hay ninguno. Nombres largos se cortan
  con "…" sin romper la tarjeta (probado a 320 px).
- Sección "Ahorro en dólares": tarjeta con título, "+ Depositar", total en USD, "≈ $ … al tipo de cambio $ …
  (ref.)" (se omite sin tipo de cambio) y lista de depósitos con avatar 💵, "USD X", "28 sep · Banco" (más la nota
  si hay) y el equivalente en pesos. Reemplaza al `<h3>` suelto "ahorro en dólares" y al botón de texto. El
  equivalente en pesos de cada depósito ahora se muestra como "$ X" (antes "X ARS"); sigue rotulado por el "$".
- Decisiones propias: meta con objetivo 0 muestra "Sin objetivo definido" en vez de "0 % logrado"; una meta
  por encima del 100 % muestra "100 % logrado" con la barra llena (no se desborda).
- **Bug previo corregido (a confirmar):** `formatUSD` estaba definida dos veces (`goals.js` y `plan.js`) y la
  de `plan.js`, que carga después, pisaba a la otra, así que todos los dólares se veían como "USD 1,240" (sin
  decimales y con coma) en vez de "USD 1.240,00". Se renombró la de Plan a `formatPlanUSD` (sus 7 usos en
  `plan.js`), de modo que Plan sigue viéndose igual y Metas/ahorro en dólares/modal de depósito usan el
  formato argentino con decimales.
- Casos de borde probados: sin metas, sin depósitos, sin tipo de cambio, meta al 100 % y por encima, meta con
  objetivo 0, nombre muy largo a 320 px, y que "Sumar", el lápiz, "+" y "+ Depositar" abren su modal. Sin errores
  de consola.

---
## FEATURE: REDISEÑO-B4 — Plan
**Estado: hecha**
**Depende de:** REDISEÑO-B3

### Qué se pide
Aplicar el diseño nuevo a `view-plan` y volver el gráfico de canvas sensible al tema. Referencia:
`Real-L-4-plan` / `Real-D-4-plan`.

### Comportamiento esperado
- Tarjeta de plan: nombre, meta ("x % anual · n años · hasta AAAA"), tres datos (Aportado, Acumulado
  hoy, Proyectado), curva y botón "Registrar pago de este mes"; botón de eliminar de 44 × 44.
- `renderPlanChart()` (`js/plan.js`): leer los colores de las variables CSS con `getComputedStyle`
  en cada dibujo (quitar `rgba(74,93,58,0.09)` y cualquier color fijo) y redibujar cuando cambia el
  tema (por ejemplo al aplicar el tema en `applyTheme()` o escuchando `prefers-color-scheme`).
- Estado vacío con el estilo nuevo.

### Casos de borde a probar
- Plan recién creado (sin aportes), plan con varios aportes, varios planes a la vez.
- Cambiar de tema con la vista de Plan abierta: el gráfico se redibuja con los colores nuevos.
- Rotación o cambio de tamaño: el canvas mantiene la proporción.

### Notas de implementación
- Archivos modificados: `index.html` (`view-plan`), `styles.css`, `js/plan.js`, `js/settings.js`
  (`applyTheme`), `js/main.js`, `sw.js` (`CACHE_NAME` v32 → v33). Ningún id existente se renombró
  (`#plan-back`, `#btn-add-plan`, `#plan-list`, `#plan-chart-<id>`, `.plan-payment-btn`, etc.).
- **Verificación contra `Real-L-4-plan` / `Real-D-4-plan`:** corrí la app en un navegador real a 390 px con tres
  planes de ejemplo y medí con JS: botones volver, + y eliminar de 44 × 44, botón de pago de 299 × 52, tarjeta
  de radio 28, título 17/700, datos 15/800; capturas en claro y oscuro. Sin colores fijos ni tokens viejos en el
  CSS nuevo (revisado por script). No probado en un celu real.
- Encabezado compartido de pantalla (`screen-header`, `screen-back`, `screen-add`, de B3); `view-plan` lleva la
  clase `themed`. Tarjeta: nombre, "6,5 % anual · 25 años · hasta 2050" (tasa con coma decimal), papelera de
  44 × 44 con `aria-label="Eliminar plan <nombre>"`, tres datos (Aportado, Acumulado hoy, Proyectado), curva,
  años de inicio y fin, y botón "Registrar pago de este mes" de 52 px.
- Decisión propia: el mockup no tiene líneas secundarias en los tres datos, pero se conservaron las que ya
  existían ("N cuotas", "N meses") y se agregó "a N años" bajo Proyectado, para no perder información.
- **Gráfico (canvas):** `renderPlanChart()` lee `--bar-fill` con `getComputedStyle` en cada dibujo; se quitó
  `rgba(74,93,58,0.09)` y el color fijo (el relleno es el mismo color con `globalAlpha` .12, y el respaldo si
  falta la variable es `currentColor`). Línea de 2,5 px y punto de "hoy" de radio 5, como el mockup. Altura
  fija de 120 px en CSS; el canvas se dibuja a `devicePixelRatio` (antes se veía borroso en pantallas retina) y
  al ancho final: las curvas se dibujan después de agregar todas las tarjetas, porque el ancho depende de si
  aparece la barra de scroll.
- **Redibujo al cambiar de tema o tamaño:** nueva `redrawPlanCharts()` (no hace nada si Plan no está abierta;
  `renderPlan()` dibuja al abrirla). Se dispara desde `applyTheme()` (cambio manual en Ajustes), desde
  `matchMedia('(prefers-color-scheme: dark)')` (modo automático con el sistema) y desde `resize`
  (rotación). Verificado leyendo el color de un píxel de la línea: `rgb(18,59,51)` en claro y `rgb(143,220,192)`
  en oscuro tras cambiar el tema con Plan abierta.
- `formatPlanUSD` (renombrada en B3) ahora usa separador de miles argentino: "USD 72.747" en vez de
  "USD 72,747", como el mockup y el resto de la app. Afecta también al modal de pago y al aviso de pago registrado.
- Estado vacío con el estilo nuevo ("Todavía no tenés planes de inversión" / "Tocá + arriba para agregar uno").
- Casos de borde probados: sin planes, plan recién creado (sin aportes: "USD 0", punto de hoy omitido), varios
  planes a la vez, nombre muy largo, 320 px de ancho (el canvas se redibuja y no desborda), cambio de tema con
  Plan abierta, y que el botón de pago y el + abren sus modales. Sin errores de consola.

---
## FEATURE: REDISEÑO-B5 — Ajustes
**Estado: hecha**
**Depende de:** REDISEÑO-B4

### Qué se pide
Aplicar el diseño nuevo a `view-settings`. Referencia: `Real-L-5-ajustes` / `Real-D-5-ajustes`.

### Comportamiento esperado
- Cada sección (categorías de gasto, categorías de ingreso, presupuestos, cuentas, gastos fijos,
  ingresos fijos, inflación, gastos hormiga, apariencia, datos) en una tarjeta con título en
  mayúsculas chicas; filas de mínimo 48 px; acciones "editar" / "quitar" con área táctil de 44 px.
- "Borrar todos los datos" con el color de peligro (`--expense`) y ícono, siempre con su `confirm()`.
- La sección "Apariencia" de B0 queda con el estilo final.

### Casos de borde a probar
- Listas largas (muchas categorías o cuentas) y listas vacías.
- Que "editar" y "quitar" no se toquen por error (separación suficiente).
- Importar / exportar datos siguen funcionando.

### Notas de implementación
- Archivos modificados: `index.html` (`view-settings`), `styles.css`, `js/settings.js`, `js/accounts.js`,
  `js/budgets.js`, `js/recurring.js`, `sw.js` (`CACHE_NAME` v33 → v34). Ningún id existente se renombró (verificado
  por script). Cada sección pasó a una tarjeta (`.settings-card`) con título en mayúsculas chicas
  (`.settings-card-title`); encabezado compartido `screen-header`; `view-settings` lleva la clase `themed`.
- **Verificación contra `Real-L-5-ajustes` / `Real-D-5-ajustes`:** corrí la app en un navegador real a 390 y 320 px con
  datos de ejemplo (categorías, presupuestos, cuentas, fijos activos y pausados, una compra en cuotas, inflación) y
  medí con JS: filas de 48 px, botones "editar" / "quitar" / "Agregar" / "Guardar" de 44 px de alto, campos de 44 px,
  selector de tema de 44 px; capturas en claro y oscuro. Sin colores fijos ni tokens viejos en el CSS nuevo
  (revisado por script). No probado en un celu real.
- Filas de categorías, presupuestos y cuentas: nombre a la izquierda; a la derecha el monto o saldo (si hay) y los
  botones "editar" (`--link`) y "quitar" (`--muted`, ya no rojo). `aria-label` con el nombre en cada botón.
- **Funcionalidad que el mockup no dibuja y se conservó:** la sección "Compras en cuotas" (resumen, lista con barra de
  avance, "historial", "editar", "quitar" y "+ Nueva compra en cuotas"); el historial de montos de gastos / ingresos fijos
  ("historial"), "pausar / activar" y "quitar"; los campos de inflación (mes actual + % + "Guardar") y del umbral de gastos
  hormiga (monto + "Guardar") en vez de los botones "Actualizar" / "Cambiar"; y el historial de inflación de los últimos
  meses. Los gastos hormiga muestran el texto aclaratorio de Reportes.
- Decisiones propias: (1) los presupuestos no tenían "editar" y el mockup lo muestra, así que se agregó: abre el
  mismo modal de presupuesto con la categoría y el límite ya cargados; (2) en gastos fijos, ingresos fijos y cuotas las
  acciones van en una segunda línea alineada a la derecha, porque con 3 o 4 acciones de 44 px no entran al lado del
  nombre; (3) los fijos pausados muestran la etiqueta "pausado" junto al nombre (antes solo cambiaba el texto del
  botón y un tinte verde, que ya no existe); (4) "Exportar" e "Importar" quedan sin ícono, como el mockup; "Borrar todos los
  datos" conserva su ícono de papelera, en `--expense-new` y siempre con sus dos `confirm()`; (5) el historial de inflación
  ahora usa coma decimal y espacio ("2,1 %", antes "2.1%").
- Accesibilidad: los campos de inflación y de umbral tienen un `<label>` con texto oculto (`.visually-hidden`).
- `.cat-remove` y `.text-btn` también las usa el modal de categorías (se migra en B6): se conservaron sus reglas
  viejas y el estilo nuevo se aplica solo dentro de `.settings-card`. `.section-label`, `.budget-limit-tag`,
  `.account-mgr-balance` y las clases `.inflation-*` viejas ya no se usan y se borraron.
- Casos de borde probados: listas vacías de fijos (mensaje), listas con nombres muy largos (no rompen la fila),
  320 px de ancho sin desbordes, "editar" y "quitar" separados por 44 px de área táctil, el modal de presupuesto abre con los
  datos, "editar" de categoría / cuenta / fijo abre su modal, pausar / activar, guardar inflación y umbral, y cambio de tema.
  Sin errores de consola. Exportar, importar y borrar no se ejercitaron en el navegador de pruebas (abren descarga o
  confirmaciones del navegador); su código no se tocó, solo el marcado de los botones.

---
## FEATURE: REDISEÑO-B6 — Hojas (modales) y diálogos
**Estado: pendiente**
**Depende de:** REDISEÑO-B5

### Qué se pide
Aplicar el patrón de hoja nuevo a **todos** los modales y hojas de la app. Referencias dibujadas:
carga de movimiento, carga rápida, transferir, depositar USD, acciones del movimiento y editar cuenta
(`Real-L-6-carga` … `Real-L-11-cuenta` y sus versiones oscuras). Los modales que no se dibujaron
(ver spec sección 6) usan el mismo patrón y los mismos componentes.

### Comportamiento esperado
- `.modal-backdrop` / `.modal-sheet` / `.modal-handle` / `.modal-title` con los tokens nuevos; se
  mantiene el mecanismo centralizado de apertura y cierre y la animación de entrada.
- Selectores de categoría y cuenta como chips de 44 px con emoji; chip "sugerido" con borde punteado.
- Botón "Gasto" activo con `--expense-solid` y "Ingreso" con `--income-solid` (texto blanco).
- Inputs con label asociado; botón primario de 56 px; "Cancelar" como botón de texto.
- Cubrir también: nueva/editar meta, sumar a meta, nuevo plan, registrar pago, categoría
  (selector de ícono y subcategorías), presupuesto, gasto fijo / ingreso fijo y calendario de racha.

### Casos de borde a probar
- Teclado numérico abierto en celu: el botón de guardar sigue alcanzable (la hoja scrollea).
- Abrir un modal desde otro (por ejemplo "nueva cuenta" desde gasto fijo): un solo overlay visible.
- Botón "atrás" del celu cierra la hoja.
- Todos los modales se ven bien en oscuro, incluido el fondo `--overlay`.

---
## FEATURE: REDISEÑO-B7 — Cierre: limpiar tokens viejos y revisión final
**Estado: pendiente**
**Depende de:** REDISEÑO-B6

### Qué se pide
Eliminar lo que quedó del diseño viejo y hacer una revisión completa en ambos temas.

### Comportamiento esperado
- Borrar de `:root` los tokens viejos (`--paper*`, `--ink*`, `--accent*`, `--income-soft`,
  `--expense-soft`, `--radius-sm|md|lg` si ya no se usan, fuentes viejas) y todo estilo huérfano. Buscar
  con `grep` que no quede ningún `var(--…)` apuntando a un token borrado ni colores hardcodeados.
- Confirmar que no se cargan las fuentes viejas.
- **Renombrar los tokens `-new`:** una vez borrados los viejos, renombrar `--income-new`,
  `--expense-new` y `--shadow-card-new` a `--income`, `--expense` y `--shadow-card` en `:root`, en los dos
  bloques oscuros y en todos los `var(...)` que los usen. Verificar con `grep` que no queda ningún
  `-new` en `styles.css`, `index.html` ni `js/`.
- **`color-scheme`:** cambiarlo para que siga al tema (`light` en claro, `dark` en `:root[data-theme="dark"]`
  y en el bloque `@media (prefers-color-scheme: dark)`), recién ahora que no queda ninguna pantalla vieja.
  Revisar que inputs, selects, scrollbars y el selector de fecha se vean bien en ambos temas.
- **`--font-ui`:** verificar con `grep` que no queda ninguna referencia a `var(--font-ui)` (en B0 se
  encontraron 5: `.dollar-type-chip`, `.dollar-rate-status`, `.subcat-toggle-btn`, `.transfer-trigger-btn`
  y `.entry-icon.transfer`); corregir las que falten con `var(--font-sans)`.
- Revisar contraste AA de texto y de los estados (barra al 90 %, pendientes, deshabilitados) en
  claro y oscuro.
- Revisar iconografía: las acciones y estados importantes no dependen solo del color.
- Actualizar la documentación del proyecto (reglas generales de `BACKLOG_FEATURES.md`) y subir
  `CACHE_NAME`.

### Casos de borde a probar
- Instalación vieja que actualiza desde la versión anterior: banner de actualización, sin
  estilos mezclados.
- Recorrido completo de todas las pantallas y modales en claro, oscuro y automático.
- Lighthouse / revisión de accesibilidad básica sin errores nuevos.
