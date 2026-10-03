# Changelog — Libro de Caja

Lo más nuevo arriba. Una entrada por feature o cambio, con el hash del commit para ver el detalle en git (`git show <hash>`).

**Formato de entrada** (al terminar una feature): `- **Nombre**: qué hace en una línea. Archivos: ... Notas: decisiones o casos de borde que no estaban en la spec. (hash)`

---

## 2026-10-02 — Rediseño visual "estilo E" y documentación

- **Aviso de ahorro del mes y cálculo de cuánto se podría ahorrar**: desde el día 15, si en el mes no hubo ahorro libre (o no se llegó al piso que eligió el usuario), aparece una tarjeta en el Inicio ("Este mes todavía no ahorraste" / "Este mes solo pusiste el plan..." / "Llevás USD X de tu piso") que abre un modal con el ahorro del mes, cuánto se podría ahorrar hoy con el cálculo a la vista, y atajos "Mi piso / Ideal / Máximo" que abren el depósito en USD con el monto cargado. También hay un acceso desde Metas (ahorro en dólares) y una sección "Ahorro" en Ajustes (piso mensual en USD opcional, % ideal de ingresos, % de colchón). Archivos: `js/savings.js` (nuevo), `js/goals.js` (`openDollarModal(prefillUSD)`), `js/state.js`, `js/settings.js`, `js/ledger.js`, `js/ui.js`, `js/main.js`, `index.html`, `styles.css`, `sw.js`. Notas: el ahorro "libre" son los depósitos de `dollarSavings`; los pagos del plan se muestran aparte y **no cuentan** para el piso ni para el aviso (ahorro de largo plazo vs. corto/mediano plazo); "podrías ahorrar" = lo que tenés ahora − fijos y cuotas pendientes − gasto variable que falta (el mayor entre el promedio de los últimos 3 meses y el ritmo actual) − colchón (% del gasto mensual promedio); es una estimación informativa, no obliga ni bloquea nada; sin tipo de cambio guardado se muestra en pesos; el aviso se puede descartar y vuelve el mes siguiente; no es push (sin servidor no hay notificaciones con la app cerrada). Limitación conocida: "lo que tenés ahora" incluye plata acumulada de meses anteriores, por eso el colchón es configurable.

- **Reporte descargable en PDF y Excel** (reemplaza a la feature "Exportar reporte mensual en PDF"): botón de descarga en Reportes y fila "Descargar reporte" en Ajustes → Datos; se elige mes, año o todo el historial. El PDF (A4) trae resumen con variación contra el período anterior, gráfico de ingresos/gastos (día a día en un mes, mes a mes en un año), categorías, día de la semana, mayores gastos, cuentas, presupuestos (solo en un mes), etiquetas, ahorro/metas, gastos compartidos sin saldar y constancia. El Excel trae las hojas Resumen, Movimientos (con filtro y montos numéricos), Por categoría, Evolución, Día de la semana, Cuentas, y Transferencias/Presupuestos si aplican. Archivos: `js/report.js` (período, estadísticas, modal), `js/reportpdf.js`, `js/reportxlsx.js` (nuevos), `js/main.js`, `js/ui.js`, `index.html`, `styles.css`, `sw.js`. Notas: jsPDF 2.5.1 y SheetJS 0.18.5 se cargan desde cdnjs al descargar (con hash SRI) y el service worker las deja cacheadas, así que offline funciona después de la primera vez; los gráficos del PDF se dibujan con primitivas vectoriales (sin canvas) y los emojis de categorías no salen en el PDF porque la fuente estándar no los tiene; en iPhone/iPad se usa la hoja de compartir (guardar en Archivos) porque la descarga por blob no es confiable ahí; los movimientos pendientes cuentan aparte y el Excel sí los lista (columna Estado).

- **Gastos compartidos con división**: toggle "Gasto compartido" en el modal de gasto (50/50 o montos personalizados que deben sumar el total), tarjeta en Reportes con lo que te deben por persona y botones "Saldado" / "Saldar todo". Archivos: `js/split.js` (nuevo), `js/ledger.js`, `js/stats.js`, `index.html`, `styles.css`. Notas: el total del gasto sigue pesando en el balance y saldar no genera ningún ingreso (es solo registro); al editar un gasto ya saldado sigue saldado si no cambió la persona ni su parte; si en el monto personalizado se escribe una parte, la otra se autocompleta con lo que falta.
- **Etiquetas libres en movimientos**: chips con sugerencias de las ya usadas en el modal de movimiento (se guardan en minúsculas, se muestran capitalizadas), y tarjeta "Gastos por etiqueta" en Reportes (este mes / todo, con desglose por categoría). Archivos: `js/tags.js` (nuevo), `js/ledger.js`, `js/stats.js`, `js/main.js`, `index.html`, `styles.css`. Notas: la carga rápida no tiene etiquetas (solo el modal completo); texto escrito sin confirmar se toma como etiqueta al guardar; el reporte cuenta solo gastos confirmados.
- **Resumen semanal automático**: tarjeta "Tu resumen de la semana está listo" en el Inicio que abre un modal con gasto total, comparación con la semana anterior, top 3 categorías y días con carga (lunes a domingo). Archivos: `js/weekly.js` (nuevo), `js/ui.js`, `js/settings.js`, `js/state.js`, `index.html`, `styles.css`. Notas: **no se abre solo** (regla de modales: se avisa con una tarjeta y se abre con un toque); `lastWeeklySummaryShown` guarda el domingo de cierre de la última semana vista o descartada, así que tras varios domingos sin abrir solo se ofrece la más reciente; una semana sin movimientos no genera resumen; el ahorro en USD no cuenta como gasto.

- **Rediseño B0–B7**: tokens semánticos, Plus Jakarta Sans, tema claro/oscuro/automático (opción en Ajustes), y migración pantalla por pantalla: Inicio, Reportes, Metas y ahorro USD, Plan, Ajustes, hojas (modales) y diálogos; B7 borró los tokens viejos. (6a30dca → b55c30f)
- **Rediseño A1–A3**: "Tenés ahora" (suma de todas las cuentas) como saldo principal del Inicio, saldo del mes en Reportes, accesos directos Gasto / Ingreso / Carga rápida en el Inicio (sin botones flotantes). (8b417fa, be712cd, 1da3327)
- **Pestaña Pendientes** y saldo negativo en rojo. (0c1422e)
- **Pagos confirmados descuentan de la cuenta**; el pago del plan de ahorro pide cuenta, con selector de cuentas visible. (db0e40a, 0b7ca57; el intento de chips compactos 6701ad1/ed246b1 se revirtió)
- **Documentación**: spec y mockups del rediseño; lista de módulos actualizada. (445c10a, 1a9bf72) Reorganizada en `docs/` con `REGLAS`, `PENDIENTES` y este changelog.

## 2026-08 — Cuotas y confirmación de pagos

- **Cuotas ya pagadas al alta** de una compra en cuotas, e **historial de precios** de gastos/ingresos fijos y cuotas (modal genérico en `ui.js`, solo lectura). Pendiente conocido: corregir el conteo de una compra cargada mal antes de este fix. (c51d0a6)
- **Preview de carga rápida** como tarjeta compacta. (5838b7a)
- **Gastos fijos: confirmación manual de pago** (botón "pagar" en el action sheet; `confirmPendingPayment()`) y **Compras en cuotas** (`installmentPurchases`, `js/installments.js`). Incluye fix: Reportes, tendencia y sugerencias ahora excluyen movimientos `pending`. (eb2d6d6)
- **Saldo total real** y fijos pendientes hasta su fecha. (e2360cf)

## 2026-07 — Metas, categorías, ahorro y carga rápida

- **Metas con edición, eliminación y moneda propia (ARS/USD)**, aportes en moneda mixta. Fix: `saveDollarDeposit()` sumaba siempre ARS. (47f2f9d)
- **Carga rápida por texto libre** (`js/quickadd.js`). (fe853cb)
- **Sugerencia automática de categoría según la nota** (`js/suggestions.js`). (28e4809)
- **Subcategorías** en categorías de gasto e ingreso. (df23a33)
- **Transferencias entre cuentas** (`js/transfers.js`, `state.transfers`). (80598f1)
- **Fix**: ajustes de saldo incluidos en balance mensual y reportes. (06a497a)
- **Ingresos fijos / recurrentes** y edición de recurrentes (paridad con gastos fijos). (76590ea)
- **PWA update flow**: banner "Hay una versión nueva disponible", `_headers` con `no-store` para `sw.js` (necesario en iOS). (b32d771)
- **Edición y gestión de categorías** de gasto e ingreso. (b4f0fb0)
- **Módulo Plan** (interés compuesto en USD), **proyección de fin de mes** y **gastos hormiga** (umbral configurable). (32c0fea)
- **Importar backup JSON** desde Ajustes. (188bfa9)
- **Cotización del dólar automática** desde DolarAPI. (be2f77c)
- **Edición de movimientos, edición de cuentas con saldo inicial y ajuste de saldo, módulo ahorro en dólares.** (864a38d)
- **Refactor**: `app.js` monolítico dividido en `js/` por dominio. (d80319c)

## 2026-06 — Base de la app

- **Fixes de modales**: anidados, backdrop en desktop, botones sin respuesta en mobile, `[hidden]` anulado por `display:flex`. (0f60317, 9eaf27c, 2064c58)
- **Comparativa con inflación** (valor cargado a mano desde Ajustes). (54246fd)
- **Calendario de racha** estilo contribution graph. (0aad971)
- **Presupuestos por categoría**. (76e3b2d)
- **Gastos fijos / recurrentes** con auto-generación mensual. (4a992b2)
- **Múltiples cuentas/billeteras**. (90f1050)
- **Commit inicial**: libro de caja PWA (movimientos, categorías, reportes, metas). (47eccab)
