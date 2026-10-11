# Rediseño de Libro de caja — Especificación visual ("Marino + ámbar")

Documento de referencia para Claude Code. Describe **qué se ve** (tokens, componentes, pantallas).
El **orden de trabajo** está en `BACKLOG_REDISENO.md` (ítems REDISEÑO-A0 … B7).

Referencia visual exacta: carpeta `mockups/` (v2, paleta marino + ámbar; **reemplaza** a los mockups verdes) (HTML estáticos, abrir en el navegador). Cada archivo
es una pantalla a 390 px de ancho, en claro (`Real-L-*`) y en oscuro (`Real-D-*`). Los valores de
este documento salen de esos archivos; si hay una duda de medida o color, **el mockup manda**.

---

## 1. Decisiones de producto (ya tomadas)

1. **Saldo principal del Inicio = "Tenés ahora (todas las cuentas)"** (`#total-balance`, suma de
   `getAccountBalance()` de todas las cuentas, no depende del mes). El **saldo del mes** pasa a ser
   información chica (en el Inicio) y se suma también arriba de Reportes.
2. **Desglose por cuenta** en el Inicio: solo las cuentas con saldo distinto de cero, como **chips horizontales con scroll**
   dentro de la tarjeta principal (así la tarjeta no crece con 4–5 cuentas). Al final de la fila hay un chip
   "Transferir" (abre `#btn-open-transfer`).
2b. **Inicio compacto (distribución B)**: barra superior → tarjeta principal → fila de 3 botones anchos
   (Gasto / Ingreso / Rápida, de A3; **sin** botones flotantes ni menú desplegable) → tarjeta chica del mes →
   banner → movimientos → barra inferior.
3. **Identidad propia "Marino + ámbar"** (v2): modo claro = fondo crema + tarjeta principal azul marino + ámbar como
   resaltado; modo oscuro = casi negro azulado + la misma tarjeta marino + ámbar. Reemplaza al verde de la v1
   (se descartó para no parecerse a otras apps). Las demás paletas exploradas **no se implementan**.
4. Se abandona la identidad "papel crema + dorado + serif". Tipografía única: **Outfit**.
5. El modo oscuro es una opción en Ajustes: Claro / Oscuro / Automático (por defecto Automático).

## 2. Tokens (variables CSS)

### 2.1 Estrategia de migración (importante)

El `:root` actual usa `--paper`, `--paper-raised`, `--paper-line`, `--ink`, `--ink-soft`, `--ink-faint`,
`--income`, `--income-soft`, `--expense`, `--expense-soft`, `--accent` (dorado), `--accent-soft`,
`--radius-*`, `--shadow-*`, `--font-*`. **No reemplazar todo de golpe.**

- En REDISEÑO-B0 se agregan los tokens **nuevos** (tabla 2.2) con nombres semánticos y los dos
  temas. Los nombres viejos se mantienen como alias o con su valor anterior hasta migrar cada
  pantalla.
- `--accent` (dorado) **cambia de rol**: en el diseño nuevo no hay dorado. El resaltado nuevo se llama
  `--highlight`. No reutilizar `--accent` para el color nuevo; cada pantalla migrada reemplaza sus
  usos de `var(--accent)` por `--link`, `--bar-fill` o `--highlight` según corresponda. En B7 se
  borran los tokens viejos.
- Hay valores hardcodeados en `styles.css` (ej. `rgba(31,27,22,…)`, `#6B4F1A`, `#2E3B23`) y colores
  fijos en el canvas de `plan.js` (`rgba(74,93,58,0.09)`). Cada pantalla migrada debe eliminarlos
  y usar tokens. Ojo: `var(--font-ui)` aparece en algunas reglas pero `:root` define `--font-body`:
  verificar con `grep` y corregir (usar el token de fuente nuevo).

### 2.2 Tokens nuevos

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F6F1E9` | `#0B0F18` | fondo de la app |
| `--surface` | `#FFFFFF` | `#141A27` | tarjetas, hojas, barra inferior |
| `--text` | `#1B2236` | `#F1EEE6` | texto principal |
| `--muted` | `#5B6477` | `#A5ADBD` | texto secundario (reemplaza `--ink-soft` y `--ink-faint`) |
| `--line` | `#DED5C6` | `#27304A` | bordes de inputs, chips, handle de hojas |
| `--divider` | `#EEE7DA` | `#1D2435` | líneas entre filas dentro de tarjetas |
| `--input-bg` | `#FAF6EF` | `#192031` | fondo de inputs y chips sin seleccionar |
| `--track` | `#E8DFCF` | `#252E45` | fondo de barras de progreso |
| `--hero` | `#1B2B4B` | `#1B2B4B` | tarjeta principal ("Tenés ahora", "Saldo del mes") |
| `--hero-text` | `#F7F4EC` | `#F7F4EC` | texto sobre `--hero` |
| `--hero-divider` | `#37496E` | `#37496E` | líneas dentro de la tarjeta hero |
| `--hero-tile` | `#26385F` | `#26385F` | mosaicos dentro de hero (Reportes) |
| `--hero-border` | `#1B2B4B` | `#35507F` | borde 1 px de hero (en oscuro la despega del fondo) |
| `--hero-icon` | `#F2B94B` | `#F2B94B` | íconos y botón de transferir sobre hero |
| `--primary` | `#1B2B4B` | `#F2B94B` | botones primarios, botón + |
| `--primary-text` | `#FFFFFF` | `#2B1D00` | texto sobre `--primary` |
| `--highlight` | `#F2B94B` | `#F2B94B` | chip de racha, botón "Sumar", badge USD |
| `--highlight-text` | `#2B1D00` | `#2B1D00` | texto sobre `--highlight` |
| `--nav-active-bg` | `#F2B94B` | `#2A3556` | pestaña activa de la barra inferior |
| `--nav-active-fg` | `#2B1D00` | `#F2B94B` | ícono/texto de pestaña activa |
| `--link` | `#1B2B4B` | `#F2B94B` | botones de texto ("+ Agregar…", "editar") |
| `--bar-fill` | `#1B2B4B` | `#F2B94B` | relleno de barras de progreso y gráficos |
| `--income` | `#1E6B3C` | `#7FD99B` | texto/monto de ingresos |
| `--expense` | `#B3361B` | `#FF9A73` | texto/monto de gastos, "Borrar datos" |
| `--income-tint` | `#E0F0E3` | `#17352A` | fondo del avatar de ingresos y del banner |
| `--expense-tint` | `#F8E3DC` | `#3A221B` | fondo del avatar de gastos |
| `--neutral-tint` | `#EBE4D6` | `#222B42` | avatar de transferencias/ajustes, badge ARS, tag "pendiente" |
| `--warn` | `#C2410C` | `#FF9A73` | barra de presupuesto al 90 % o más |
| `--banner-bg` / `--banner-fg` | `#F6E7C6` / `#5A3E00` | `#2B2A1D` / `#F2D58A` | banner de sugerencias |
| `--seg-selected-bg` / `-fg` | `#1B2B4B` / `#F7F4EC` | `#1B2B4B` / `#F7F4EC` | opción activa de controles segmentados |
| `--chip-selected-bg` / `-fg` / `-border` | `#1B2B4B` / `#F7F4EC` / `#1B2B4B` | `#1B2B4B` / `#F7F4EC` / `#35507F` | chip seleccionado |
| `--expense-solid` | `#B4451F` | `#B4451F` | botón "Gasto" activo en la hoja de carga (texto blanco) |
| `--income-solid` | `#1E6B3C` | `#2E7D4A` | botón "Ingreso" activo (texto blanco). *Derivado: no está dibujado.* |
| `--overlay` | `rgba(27,34,54,.55)` | `rgba(0,0,0,.65)` | fondo oscurecido detrás de hojas |
| `--shadow-card` | `0 8px 24px rgba(27,43,75,.15)` | `0 8px 24px rgba(0,0,0,.55)` | barra inferior, FABs |

Al implementar, verificar contraste WCAG AA (4,5:1 texto normal) en ambos temas.
Ingresos y gastos **nunca se distinguen solo por color**: siempre signo (+/−) o flecha.

## 3. Tipografía

- Una sola familia: **Outfit** (pesos 400, 500, 600, 700, 800) desde Google Fonts, con
  fallback `system-ui, sans-serif`. Reemplaza Source Serif 4, Inter y JetBrains Mono.
- Números y montos: `font-variant-numeric: tabular-nums` (reemplaza la fuente mono).
- Escala: monto hero 42/800 (−0.03em) · monto en Reportes hero 36/800 · monto de meta 24/800 ·
  títulos de tarjeta 16/700 · título de pantalla 18/700 · cuerpo 14/600 (títulos de fila) y 14/500 ·
  secundario 12 · etiquetas en mayúsculas 11/700 con `letter-spacing: .06em`.
- El texto de la interfaz va en minúscula inicial/oración normal ("Tenés ahora", "Libro"); no se
  fuerza `text-transform: lowercase` como hoy.
- Actualizar los `<link>` de fuentes en `index.html`; el service worker ya cachea respuestas GET.

## 4. Forma, tamaños, espaciado

- Radios: tarjeta principal 28 px · tarjeta interna / mosaico 22 px · input / chip contenedor 16 px ·
  botones y chips: pastilla (alto/2) · hoja (bottom sheet) 28 px arriba.
- **Objetivo táctil mínimo 44 × 44 px** en todo lo que se toca (chips, filas con acciones, botones de
  texto, íconos). Botón primario de hoja: alto 56. Inputs: alto 48.
- Padding lateral de pantalla: 20 px. Separación entre tarjetas: 12 px (10 entre las chicas).
- Barra inferior flotante: `left/right 20px`, `bottom 16px`, alto 68, radio 34, 5 pestañas
  (Libro, Reportes, Metas, Ajustes, Plan; mismo orden que hoy), ícono 20 + etiqueta 11. Pestaña
  activa: pastilla 64 × 54 con `--nav-active-bg`. El contenido necesita `padding-bottom ≥ 110px`.
- **No hay botones flotantes** (A3 los reemplazó): los accesos Gasto / Ingreso / Rápida viven en el Inicio
  (fila de 3 botones anchos, alto 48, pastilla). Conservar los ids `#btn-add` y `#btn-quick-add` en esos botones si el JS los usa.

## 5. Componentes

- **Tarjeta**: `--surface`, radio 28 (22 si es chica), padding 16–18. Sin borde; la separación viene
  del contraste con `--bg`.
- **Hero**: `--hero`, texto `--hero-text`, borde 1 px `--hero-border`, radio 28, padding 20.
  Etiqueta 13/500 al 80 % de opacidad; monto 42/800. Lista de cuentas: filas de 40 px, divisores
  `--hero-divider`; abajo botón "Transferir entre cuentas" (alto 48, color `--hero-icon`).
- **Fila de movimiento**: avatar circular 38 px (emoji 18 px, fondo `--income-tint` /
  `--expense-tint` / `--neutral-tint`), título 14/600, subtítulo 12 `--muted`, monto 14/700 a la
  derecha. Pendiente: opacidad .6 y tag "pendiente". Transferencia (↔) y ajuste (⚖️): avatar y monto
  neutros. El emoji de categoría/cuenta sigue siendo el que elige el usuario.
- **Control segmentado** (filtro Todos/Ingresos/Gastos, Claro/Oscuro/Automático, Gasto/Ingreso):
  contenedor radio 26, padding 4, fondo `--bg`; opción activa `--seg-selected-bg`, alto 44.
- **Chip** (categoría, cuenta, tipo): alto 44, radio pastilla, `--input-bg` + borde `--line`;
  seleccionado `--chip-selected-*`; "sugerido" = borde 1.5 px punteado `--link`.
- **Botón primario**: alto 52–56, pastilla, `--primary` / `--primary-text`. **Botón "Sumar"** y chip de
  racha: `--highlight` / `--highlight-text`. **Botón de texto**: alto 44, 14/700, `--link`.
- **Barra de progreso**: alto 10–12, radio mitad, fondo `--track`, relleno `--bar-fill`
  (`--warn` si el presupuesto va al 90 % o más, y además el texto dice "casi al límite").
- **Hoja (bottom sheet)**: `--surface`, radio 28 arriba, handle 40 × 5 `--line`, título 18/700 alineado
  a la izquierda, fondo `--overlay`. Mismo mecanismo de apertura/cierre centralizado que hoy.
- **Input**: alto 48, radio 16, `--input-bg`, borde 1 px `--line`; etiqueta arriba 12/700 en
  mayúsculas `--muted`. Todo input con su `<label for>`.
- **Banner de sugerencia**: `--banner-bg`, radio 20, `◆` + texto 13.

## 6. Pantallas: mockup → DOM actual

**Regla general: no renombrar ids existentes** (el JS depende de ellos). Se cambia estructura de
contenedores y clases, no ids.

| Pantalla | Mockups | Ids / clases actuales a respetar | Cambios |
|---|---|---|---|
| Inicio (libro, distribución B compacta) | `Real-L-1-inicio`, `Real-D-1-inicio` | `#prev-month`, `#current-month-label`, `#next-month`, `#streak-bar`, `#streak-count`, `#streak-today-badge`, `#total-balance`, `#account-breakdown`, `#btn-open-transfer`, `#month-income`, `#month-expense`, `#month-balance`, `#suggestion-banner`, `#filter-pills` (`data-filter`), `#ledger-list`, `#empty-state`, `#btn-add`, `#btn-quick-add`, `.bottom-nav .nav-item[data-view]` | navegación de mes y racha pasan a la barra superior (píldora + chip); hero con total + chips de cuentas (scroll horizontal) + chip "Transferir"; fila de 3 botones anchos Gasto/Ingreso/Rápida (sin flotantes); tarjeta chica con ingresos/gastos/saldo del mes; filtro como control segmentado; filas nuevas |
| Reportes | `Real-L-2-reportes`, `Real-D-2-reportes` | `#stats-month-label`, `#metric-*`, `#category-bars`, `#trend-chart`, `#ants-section-label`, `#ants-category-bars` | hero "Saldo del mes" nuevo (`#stats-month-balance`); métricas en grilla de 2; barras con emoji; gráfico de 6 meses con mes actual resaltado |
| Metas | `Real-L-3-metas`, `Real-D-3-metas` | `#goals-body`, `#btn-add-goal`, `.goal-card`, sección de ahorro en dólares (`renderDollarSavings`) | tarjeta por meta con badge ARS/USD, "Sumar", `≈ $ … (ref.)` en metas USD; sección de dólares con total, equivalente y depósitos |
| Plan | `Real-L-4-plan`, `Real-D-4-plan` | `#plan-list`, `#btn-add-plan`, `.plan-card`, `#plan-chart-<id>` (canvas) | tarjeta con 3 datos, curva y botón de pago; **el canvas debe leer colores de las variables CSS y redibujarse al cambiar de tema** |
| Ajustes | `Real-L-5-ajustes`, `Real-D-5-ajustes` | `.category-manager`, `.category-manager-row`, `.text-btn`, `.settings-row`, secciones actuales | cada sección es una tarjeta; filas de 48 px; **sección nueva "Apariencia"** (`#theme-selector`) |
| Hojas | `Real-L-6-carga` … `Real-L-11-cuenta` (y `Real-D-*`) | `.modal-backdrop`, `.modal-sheet`, `.modal-handle`, `.modal-title`, `.category-grid`, `.account-grid`, `.category-chip`, `.chip-icon`, `.field-group`, `.field-label`, `.text-input`, `.btn-save`, `.btn-cancel` | carga de movimiento, carga rápida, transferir, depositar USD, acciones (editar/eliminar), editar cuenta |

Hojas **no dibujadas** (usar el mismo patrón de hoja y los mismos componentes): nueva/editar meta,
sumar a meta (con selector de moneda y tipo de cambio), nuevo plan, registrar pago del plan, nueva/editar
categoría (con selector de ícono y subcategorías), presupuesto, gasto fijo / ingreso fijo, calendario
de racha. Los `confirm()` nativos se mantienen.

## 7. Modo oscuro y cambio de tema

- `:root` define el tema claro. `:root[data-theme="dark"]` define el oscuro.
- Automático: `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { …tokens oscuros… } }`
  (los mismos valores, sin duplicar a mano si se puede evitar).
- Preferencia guardada en `state.settings.theme` (`'auto' | 'light' | 'dark'`, default `'auto'`) con
  default en `loadState()`, `clearAllData()` e importación.
- Para evitar un destello de tema equivocado al abrir, un script mínimo inline en `<head>` lee
  `localStorage['libro-caja-data-v1']` y setea `data-theme` antes del primer pintado.
- `color-scheme` acorde al tema. `<meta name="theme-color">` con variantes (`media`) claro/oscuro y
  actualización dinámica al cambiar la preferencia. `manifest.json`: `theme_color` y
  `background_color` pasan a `#EEF2EC`.
- Los gráficos que usan canvas o colores en JS (`plan.js`) leen las variables con
  `getComputedStyle(document.documentElement)` y se redibujan al cambiar de tema.

## 8. Despliegue

- Cada ítem que toque HTML/CSS/JS **sube `CACHE_NAME` en `sw.js`** (hoy `libro-de-caja-v14`) y
  agrega a `ASSETS_TO_CACHE` cualquier archivo nuevo. Sin eso el banner de actualización no llega.
- Probar cada ítem en el celu real, en claro y en oscuro, antes de seguir.
- La carpeta `mockups/` es material de referencia: si se copia al repo (por ejemplo a
  `docs/rediseno/`), queda publicada en Netlify. Si no se quiere publicar, no commitearla o excluirla.

## 9. Fuera de alcance

Variante azul/celeste, gráficos nuevos, cambios de datos o de lógica salvo los dos de REDISEÑO-A1 y A2,
nuevas pestañas, y reordenar la barra inferior.


---
## Anexo v2 — contraste verificado (WCAG AA)

Muted sobre bg claro 5,3:1 · texto sobre bg 14:1 · ingreso/gasto sobre tarjeta ≥ 6:1 en claro y ≥ 8:1 en oscuro ·
texto sobre hero 12,8:1 · ámbar sobre marino 7,9:1 · texto oscuro sobre ámbar 9,2:1 · blanco sobre `--expense-solid`
5,5:1 y sobre `--income-solid` ≥ 5:1. Si al implementar algún par queda bajo 4,5:1, oscurecer/aclarar el token, no el texto.
