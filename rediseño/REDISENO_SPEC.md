# Rediseño de Libro de caja — Especificación visual ("estilo E")

Documento de referencia para Claude Code. Describe **qué se ve** (tokens, componentes, pantallas).
El **orden de trabajo** está en `BACKLOG_REDISENO.md` (ítems REDISEÑO-A0 … B7).

Referencia visual exacta: carpeta `mockups/` (HTML estáticos, abrir en el navegador). Cada archivo
es una pantalla a 390 px de ancho, en claro (`Real-L-*`) y en oscuro (`Real-D-*`). Los valores de
este documento salen de esos archivos; si hay una duda de medida o color, **el mockup manda**.

---

## 1. Decisiones de producto (ya tomadas)

1. **Saldo principal del Inicio = "Tenés ahora (todas las cuentas)"** (`#total-balance`, suma de
   `getAccountBalance()` de todas las cuentas, no depende del mes). El **saldo del mes** pasa a ser
   información chica (en el Inicio) y se suma también arriba de Reportes.
2. **Desglose por cuenta** en el Inicio: solo las cuentas con saldo distinto de cero.
3. **Modo claro** verde (base) y **modo oscuro** (negro + el mismo verde). Existe también una
   variante azul/celeste en el lienzo de diseño, **no se implementa** (queda como alternativa).
4. Se abandona la identidad "papel crema + dorado + serif". Tipografía única: Plus Jakarta Sans.
5. El modo oscuro es una opción en Ajustes: Claro / Oscuro / Automático (por defecto Automático).
6. El Inicio tiene accesos directos Gasto / Ingreso / Carga rápida en el medio; no hay botones flotantes.

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

> **Nombres con sufijo `-new` (vigente desde REDISEÑO-B0).** Tres tokens de la tabla chocan con
> nombres que ya existen en `:root` con otro valor y que usan las pantallas viejas. Hasta REDISEÑO-B7
> se llaman así: `--income` → **`--income-new`**, `--expense` → **`--expense-new`** y
> `--shadow-card` → **`--shadow-card-new`**. En cualquier ítem B1–B6, **donde esta spec diga
> `--income`, `--expense` o `--shadow-card` hay que usar la versión `-new`**; usar el nombre sin sufijo
> daría el color viejo (oliva / terracota) y en oscuro no cambiaría. En B7 se borran los viejos y se
> renombran estos tres (ver el ítem B7). El resto de los tokens se usa con el nombre exacto de la tabla.
>
> `color-scheme` se queda en `light` hasta REDISEÑO-B7: entre B1 y B6 hay pantallas migradas y
> pantallas viejas en crema, y un `color-scheme: dark` oscurecería los controles nativos de las viejas.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#EEF2EC` | `#0A0A0A` | fondo de la app |
| `--surface` | `#FFFFFF` | `#161817` | tarjetas, hojas, barra inferior |
| `--text` | `#14231F` | `#ECEEED` | texto principal |
| `--muted` | `#55645E` | `#A2AAA6` | texto secundario (reemplaza `--ink-soft` y `--ink-faint`) |
| `--line` | `#CBD6C8` | `#2E3231` | bordes de inputs, chips, handle de hojas |
| `--divider` | `#EEF2EC` | `#232625` | líneas entre filas dentro de tarjetas |
| `--input-bg` | `#F7FAF6` | `#1D201F` | fondo de inputs y chips sin seleccionar |
| `--track` | `#DDE6DA` | `#262A29` | fondo de barras de progreso |
| `--hero` | `#123B33` | `#123B33` | tarjeta principal ("Tenés ahora", "Saldo del mes") |
| `--hero-text` | `#F4F7F1` | `#F2F7F4` | texto sobre `--hero` |
| `--hero-divider` | `#2B5A50` | `#2A5A4F` | líneas dentro de la tarjeta hero |
| `--hero-tile` | `#1E5148` | `#1B4D42` | mosaicos dentro de hero (Reportes) |
| `--hero-border` | `#123B33` | `#1F5448` | borde 1 px de hero (en oscuro la despega del fondo) |
| `--hero-icon` | `#D3F26A` | `#8FDCC0` | íconos y botón de transferir sobre hero |
| `--primary` | `#123B33` | `#8FDCC0` | botones primarios, botón + |
| `--primary-text` | `#F4F7F1` | `#07231B` | texto sobre `--primary` |
| `--highlight` | `#D3F26A` | `#8FDCC0` | chip de racha, botón "Sumar", badge USD |
| `--highlight-text` | `#14231F` | `#07231B` | texto sobre `--highlight` |
| `--nav-active-bg` | `#D3F26A` | `#1D3A32` | pestaña activa de la barra inferior |
| `--nav-active-fg` | `#14231F` | `#8FDCC0` | ícono/texto de pestaña activa |
| `--link` | `#0F5A4A` | `#8FDCC0` | botones de texto ("+ Agregar…", "editar") |
| `--bar-fill` | `#123B33` | `#8FDCC0` | relleno de barras de progreso y gráficos |
| `--income` | `#14532D` | `#7FD99B` | texto/monto de ingresos |
| `--expense` | `#9A3412` | `#FF9A73` | texto/monto de gastos, "Borrar datos" |
| `--income-tint` | `#DCEFD9` | `#183524` | fondo del avatar de ingresos y del banner |
| `--expense-tint` | `#FBE3D6` | `#3A241C` | fondo del avatar de gastos |
| `--neutral-tint` | `#E4EBE1` | `#262A29` | avatar de transferencias/ajustes, badge ARS, tag "pendiente" |
| `--warn` | `#C2410C` | `#FF9A73` | barra de presupuesto al 90 % o más |
| `--banner-bg` / `--banner-fg` | `#DCEFD9` / `#14532D` | `#183524` / `#7FD99B` | banner de sugerencias |
| `--seg-selected-bg` / `-fg` | `#123B33` / `#F4F7F1` | `#123B33` / `#F2F7F4` | opción activa de controles segmentados |
| `--chip-selected-bg` / `-fg` / `-border` | `#123B33` / `#F4F7F1` / `#123B33` | `#123B33` / `#F2F7F4` / `#2F6A5C` | chip seleccionado |
| `--expense-solid` | `#B4451F` | `#B4451F` | botón "Gasto" activo en la hoja de carga (texto blanco) |
| `--income-solid` | `#14532D` | `#2E7D4A` | botón "Ingreso" activo (texto blanco). *Derivado: no está dibujado.* |
| `--overlay` | `rgba(18,35,31,.55)` | `rgba(0,0,0,.65)` | fondo oscurecido detrás de hojas |
| `--shadow-card` | `0 8px 24px rgba(18,59,51,.14)` | `0 8px 24px rgba(0,0,0,.55)` | barra inferior, FABs |

Al implementar, verificar contraste WCAG AA (4,5:1 texto normal) en ambos temas.
Ingresos y gastos **nunca se distinguen solo por color**: siempre signo (+/−) o flecha.

## 3. Tipografía

- Una sola familia: **Plus Jakarta Sans** (pesos 400, 500, 600, 700, 800) desde Google Fonts, con
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
- Accesos directos (reemplazan a los botones flotantes): fila de 3 botones circulares de 56 px con etiqueta debajo (12/600), en columnas iguales, entre la tarjeta del mes y el banner. Gasto (`#btn-add-expense`, flecha ↗ en `--expense`), Ingreso (`#btn-add-income`, flecha ↙ en `--income`) y Carga rápida (`#btn-quick-add`, ícono ⚡ en `--text`). Círculo `--surface`; en oscuro con borde 1 px `--line`. Ya no hay botón + flotante.

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
| Inicio (libro) | `Real-L-1-inicio`, `Real-D-1-inicio` | `#prev-month`, `#current-month-label`, `#next-month`, `#streak-bar`, `#streak-count`, `#streak-today-badge`, `#total-balance`, `#account-breakdown`, `#btn-open-transfer`, `#month-income`, `#month-expense`, `#month-balance`, `#suggestion-banner`, `#filter-pills` (`data-filter`), `#ledger-list`, `#empty-state`, `#btn-add-expense`, `#btn-add-income`, `#btn-quick-add`, `.bottom-nav .nav-item[data-view]` | navegación de mes y racha pasan a la barra superior (píldora + chip); hero con total + cuentas + transferir; tarjeta chica con ingresos/gastos/saldo del mes; filtro como control segmentado; filas nuevas; fila de accesos directos que reemplaza a los botones flotantes |
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

Variante azul/celeste, gráficos nuevos, cambios de datos o de lógica salvo los de REDISEÑO-A1, A2 y A3,
nuevas pestañas, y reordenar la barra inferior.
