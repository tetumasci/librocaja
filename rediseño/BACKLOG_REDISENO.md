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
**Estado: pendiente**
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

---
## FEATURE: REDISEÑO-A2 — Saldo del mes en Reportes
**Estado: pendiente**
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

---
## FEATURE: REDISEÑO-B0 — Tokens, tipografía y tema claro/oscuro
**Estado: pendiente**
**Depende de:** REDISEÑO-A2

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

---
## FEATURE: REDISEÑO-B1 — Inicio (libro)
**Estado: pendiente**
**Depende de:** REDISEÑO-B0

### Qué se pide
Aplicar el diseño nuevo al Inicio, en claro y en oscuro. Referencia: `Real-L-1-inicio` y
`Real-D-1-inicio`. Es también el momento de migrar la **barra inferior** y los **botones flotantes**
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
- Barra inferior flotante con 5 pestañas y botones flotantes **+** y **⚡**, según la spec.
- `padding-bottom` del contenido ≥ 110 px para que nada quede tapado.
- Sin colores ni medidas hardcodeadas: solo tokens.

### Casos de borde a probar
- Sin movimientos en el mes (`#empty-state`), con 1 sola cuenta, con 5 o más cuentas con saldo.
- Montos grandes (por ejemplo `$ 12.345.678`) sin romper el ancho de la tarjeta hero ni de las filas.
- Textos largos de nota/categoría: truncan con puntos suspensivos, no rompen la fila.
- Cambiar de claro a oscuro con la pantalla abierta.
- Pantalla angosta (320 px) y celu con barra de gestos.
- Que los botones flotantes no tapen el último movimiento (se puede scrollear por debajo).

---
## FEATURE: REDISEÑO-B2 — Reportes
**Estado: pendiente**
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

---
## FEATURE: REDISEÑO-B3 — Metas y ahorro en dólares
**Estado: pendiente**
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

---
## FEATURE: REDISEÑO-B4 — Plan
**Estado: pendiente**
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

---
## FEATURE: REDISEÑO-B5 — Ajustes
**Estado: pendiente**
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
