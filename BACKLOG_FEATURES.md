# Backlog de features — Libro de Caja

## Cómo usar este documento (instrucciones para Claude Code)

Este es un backlog vivo. Cada feature tiene un estado: `pendiente`,
`en progreso`, o `hecha`.

**Instrucciones de trabajo:**
1. Buscar la primera feature en estado `pendiente` (de arriba hacia
   abajo — el orden importa, respeta dependencias entre features).
2. Antes de tocar código, leer `index.html`, `styles.css` y `app.js`
   completos para entender el estado actual real (no asumir que el
   código quedó exactamente como se describe en features anteriores).
3. Cambiar el estado de esa feature a `en progreso` en este mismo
   archivo.
4. Implementarla siguiendo las reglas generales de la sección de abajo.
5. Probar los casos de borde listados en la feature.
6. Cambiar el estado a `hecha`, y agregar debajo de la feature una
   sub-sección `### Notas de implementación` con: qué archivos se
   modificaron, cualquier decisión de diseño que no estaba explícita en
   el enunciado y tuviste que resolver por tu cuenta, y cualquier caso
   de borde que encontraste y no está listado abajo.
7. Parar ahí. No continuar automáticamente con la siguiente feature en
   la misma sesión salvo que el usuario lo pida explícitamente — cada
   feature se prueba en el dispositivo real antes de seguir.

**Si una feature depende de otra que todavía está `pendiente`:** avisar
al usuario en vez de implementarla fuera de orden.

---

## Reglas generales (aplican a TODAS las features de este documento)

- **Identidad visual intocable**: papel crema (`--paper: #FAF6EF`), tinta
  (`--ink: #1F1B16`), terracota gastos (`--expense: #B8512F`), oliva
  ingresos (`--income: #4A5D3A`), dorado acento (`--accent: #C99A3D`).
  Tipografía: Source Serif 4 display, Inter UI, JetBrains Mono números.
- **Sin frameworks ni build step** — sigue siendo HTML/CSS/JS vanilla
  servido como archivos estáticos, salvo que una feature puntual diga lo
  contrario explícitamente.
- **Modularización ya aplicada**: el código vive organizado en `js/`
  (`state.js`, `ui.js`, `ledger.js`, `accounts.js`, `recurring.js`,
  `budgets.js`, `goals.js`, `stats.js`, `settings.js`, `main.js`), cargados
  como `<script>` tags en orden de dependencia desde `index.html`. El
  archivo `app.js` monolítico ya no existe. **Antes de escribir código
  para cualquier feature nueva, decidí a qué archivo de `js/` pertenece
  (o si hace falta crear uno nuevo con su propio nombre de dominio) y
  decilo en una línea antes de empezar a programar.** Nunca vuelvas a
  crear o reutilizar un `app.js` monolítico.
- **Persistencia**: todo campo nuevo en `state` debe tener default
  sensato en `loadState()` para no romper instalaciones existentes.
- **Un solo overlay/modal visible a la vez** — usar siempre el mecanismo
  centralizado de apertura/cierre ya existente, nunca abrir un modal
  hardcodeado por fuera de ese sistema.
- **Modales nunca se auto-abren**: ningún modal debe abrirse como
  consecuencia de la carga de la página o de un render automático — solo
  como respuesta directa a una acción del usuario (click/tap). Este fue
  un bug real ya corregido una vez, prestar atención a no reintroducirlo.
- **Moneda explícita siempre**: `formatMoney()` para pesos, formateador
  separado y etiquetado "USD" para dólares. Nunca un símbolo "$" sin
  aclarar de qué moneda se trata en pantalla.
- **Sin backend**: todo sigue viviendo en `localStorage` del dispositivo,
  salvo llamadas de solo lectura a APIs públicas para datos externos
  (cotización del dólar, inflación) cuando la feature lo pida
  explícitamente — nunca enviar datos del usuario a ningún servidor.
- **Bump de versión del SW obligatorio en cada push**: cada vez que se
  modifique cualquier archivo JS/CSS/HTML y se haga push, incrementar el
  número en `CACHE_NAME` de `sw.js` (ej. `v8` → `v9`). Sin este cambio
  el browser no detecta que hay una nueva versión y el banner de
  actualización nunca aparece en iOS.

---

## FEATURE: Edición completa de movimientos existentes
**Estado: hecha**

### Qué se pide
Hoy los movimientos solo se pueden borrar (toque → confirm). Agregar la
posibilidad de **editar** cualquier movimiento ya cargado.

### Comportamiento esperado
- Al tocar un movimiento en el listado, en vez de preguntar directamente
  si borrar, mostrar un pequeño action sheet (bottom sheet simple con dos
  opciones: "editar" y "eliminar").
- "Editar" abre el mismo modal de carga de movimiento (`modal-backdrop`
  / `modal-sheet` ya existente) pero pre-poblado con los datos del
  movimiento: monto, tipo (gasto/ingreso), categoría seleccionada, cuenta,
  nota y fecha. El botón de guardar dice "guardar cambios" en vez de
  "anotar movimiento".
- Al guardar, reemplaza el entry existente en `state.entries` por la
  versión editada (mismo `id`, mismo `createdAt`, actualizar `updatedAt`
  con `Date.now()`). No crear un entry nuevo.
- Al eliminar desde el action sheet, mismo comportamiento actual (confirm
  → borrar).

### Campos editables
Todos: tipo (gasto ↔ ingreso), monto, categoría, cuenta (`accountId`),
nota y fecha. El `id` y `createdAt` nunca se modifican.

### Casos de borde a probar
- Editar un movimiento y cambiarle la cuenta: el saldo por cuenta debe
  recalcularse correctamente (restar del saldo de la cuenta vieja, sumar
  a la nueva).
- Editar un movimiento `autoGenerated` (de un gasto fijo): confirmar que
  sigue funcionando y no rompe la lógica de generación automática futura.
- Cancelar una edición a mitad de camino: no debe alterar el entry
  original.

### Notas de implementación
- Archivos modificados: `index.html`, `styles.css`, `js/ledger.js`, `js/main.js`, `js/state.js`
- Action sheet (`#action-sheet-backdrop`) con dos botones: "editar" y "eliminar". Se oculta el botón "editar" si el entry es de tipo `adjustment`.
- Variable global `editingEntryId` y `actionSheetEntry` en `state.js`.
- `openEditModal(entry)` pre-puebla el modal sin llamar a `setEntryType()` (esa función resetea `selectedCategoryId`); en cambio, toggle manual de botones + `renderCategoryGrid()` con el id ya seteado.
- `saveEntry()` ramifica: si `editingEntryId` existe, actualiza el entry en `state.entries` (mismo id, mismo createdAt, agrega updatedAt); si no, crea uno nuevo.

---

## FEATURE: Edición de cuentas y saldo inicial
**Estado: hecha**

### Qué se pide
Las cuentas (entidad `accounts`) hoy solo se pueden crear y (si no tienen
movimientos) eliminar. Agregar:

1. **Editar nombre, tipo e ícono** de una cuenta existente desde Ajustes,
   sin importar si tiene movimientos.
2. **Saldo inicial**: cada cuenta tiene un campo `initialBalance` (número,
   default `0`). El usuario puede setearlo al crear la cuenta o editarlo
   después. Representa el saldo que tenía la cuenta antes de empezar a
   usar la app (plata que ya existía y que no está registrada como
   movimiento).
3. **Ajuste manual de saldo** ("corrección de saldo"): si el saldo
   calculado (initialBalance + movimientos) difiere de la realidad (porque
   no cargó todo o porque hubo algo que no registró), el usuario puede
   ingresar el saldo real actual y la app calcula automáticamente la
   diferencia y la registra como un movimiento especial de tipo
   `adjustment` (ni gasto ni ingreso puro — mostrar con ícono distinto,
   ej. ⚖️, y etiqueta "ajuste de saldo"). Esto es para no tener que
   reconstruir el historial completo.

### Saldo por cuenta en la vista principal
En el resumen mensual, debajo del balance total, mostrar el saldo actual
de cada cuenta (initialBalance + todos los movimientos de esa cuenta hasta
hoy, no solo del mes). Formato: nombre de cuenta + ícono + saldo.

### Casos de borde a probar
- Setear saldo inicial en una cuenta que ya tiene movimientos cargados:
  el saldo mostrado debe recalcularse sumando el nuevo `initialBalance`
  sin duplicar ni perder los movimientos existentes.
- Ajuste de saldo con diferencia negativa (el saldo real es menor al
  calculado): el movimiento de ajuste debe restar correctamente, no
  romper si el resultado dejaría el saldo en negativo.
- Editar el tipo/ícono de una cuenta con movimientos ya categorizados con
  el ícono viejo: los movimientos existentes deben reflejar el ícono
  nuevo (el ícono se lee de la cuenta, no se copia al movimiento).

### Notas de implementación
- Archivos modificados: `index.html`, `styles.css`, `js/accounts.js`, `js/state.js`
- Campo `initialBalance` agregado a `DEFAULT_ACCOUNTS` y a la migración en `loadState()`.
- `getAccountBalance(accountId)` suma `initialBalance` + movimientos (income suma, expense resta, adjustment suma signed).
- Modal de cuenta re-usa el existente; se detecta si es edición por `editingAccountId`. En modo edición aparece la sección `#account-adjustment-section` con el saldo calculado y campo de saldo real.
- Si el usuario ingresa un saldo real distinto al calculado, `saveAccount()` crea un entry de tipo `adjustment` con la diferencia (puede ser positiva o negativa).
- `renderAccountBreakdown()` muestra todas las cuentas con su saldo total actual (no solo mensual).

---
## FEATURE: Edición de categorías
**Estado: hecha**

### Qué se pide
Hoy las categorías (tanto de gasto como de ingreso) solo se pueden crear
y, si no están en uso, eliminar (ver gestor de categorías en Ajustes).
Agregar la posibilidad de **editar** el nombre y el ícono de una
categoría ya existente, esté o no en uso.

### Comportamiento esperado
- En el gestor de categorías de Ajustes, cada fila de categoría debe
  tener, además de la opción "quitar" ya existente, una opción "editar".
- "Editar" abre un modal (reusando el mismo patrón visual que el modal de
  "nueva categoría" ya existente) pre-poblado con el nombre y el ícono
  actual de esa categoría. El botón de guardar dice "guardar cambios" en
  vez de "agregar".
- Al guardar, actualiza el objeto de esa categoría en `state.categories`
  (o `state.incomeCategories` según corresponda) en el mismo lugar del
  array, sin cambiar su `id`.
- Como el `id` de la categoría no cambia, todos los movimientos
  existentes que ya usan esa categoría (`categoryId`) deben reflejar
  automáticamente el nombre e ícono nuevos en el listado, en reportes, y
  en cualquier otro lugar donde se muestre — no hace falta migrar nada en
  `entries`, ya que esos solo guardan la referencia por `id`.
- Debe funcionar igual tanto para categorías de gasto como de ingreso
  (hoy son dos listas separadas, `state.categories` y
  `state.incomeCategories` — el modal de edición debe operar sobre la
  lista correcta según de cuál categoría se trate).

### Casos de borde a probar
- Editar el nombre de una categoría que ya tiene movimientos cargados: 
  confirmar que el listado de movimientos, los reportes (barras por
  categoría) y los presupuestos vinculados a esa categoría (si la
  feature de presupuestos ya está implementada) muestran el nombre nuevo
  sin romper nada.
- Editar el ícono de una categoría con presupuesto asignado: el
  presupuesto debe seguir vinculado correctamente por `categoryId`, no
  por nombre.
- Intentar guardar con el nombre vacío: debe bloquearse igual que en la
  creación de categoría nueva.
- Cancelar la edición a mitad de camino: no debe alterar la categoría
  original.

### Notas de implementación
- Archivos modificados: `index.html`, `js/settings.js`, `js/state.js`, `js/main.js`
- Se agregó sección "categorías de ingreso" en Ajustes (`income-category-manager`) con botón "+ agregar categoría de ingreso". Antes de esta feature, las categorías de ingreso no tenían ninguna UI en Ajustes.
- La lógica de renderizado de filas se extrajo a `renderCategoryRows(container, list, listKey)`, compartida entre `renderCategoryManager()` y `renderIncomeCategoryManager()`.
- Cada fila muestra ambos botones "editar" y "quitar". El botón "quitar" ahora opera sobre la lista correcta según `data-list="expense"|"income"`.
- El modal existente `cat-modal-backdrop` se reutiliza para los tres casos (nueva categoría de gasto, nueva de ingreso, editar cualquiera). Título y texto del botón guardar se actualizan dinámicamente al abrir.
- Variables nuevas `editingCategoryId` y `editingCategoryList` en `state.js` controlan el modo del modal.
- `saveCategory()` ramifica: si `editingCategoryId` existe, actualiza en el lugar del array (mismo `id`); si no, hace push. Como el `id` no cambia en edición, todos los movimientos, presupuestos y reportes reflejan el cambio automáticamente.
- Caso de borde no listado: si el ícono actual de una categoría no está en `ICON_OPTIONS` (ej. un emoji agregado manualmente por un futuro feature), el icon picker lo pre-selecciona visualmente aunque no figure en el grid — no rompe, simplemente no se ve resaltado ningún item hasta que el usuario elige uno.

---
## FEATURE: Ingresos fijos / recurrentes
**Estado: hecha**

### Qué se pide
Hoy existe el módulo de gastos fijos/recurrentes (`recurringExpenses`),
pero no hay equivalente para ingresos habituales (ej. sueldo, alquiler
que se cobra, mesada). Agregar un módulo espejo de "ingresos fijos", con
el mismo nivel de funcionalidad que gastos fijos: crear, **editar**,
pausar y eliminar — no solo pausar/quitar como pedía originalmente el
módulo de gastos.

### Modelo de datos
Nueva entidad `recurringIncomes`, mismo shape que `recurringExpenses`
pero para ingresos:
```
{
  id,
  name,            // ej "Sueldo", "Alquiler cobrado"
  amount,
  categoryId,      // referencia a state.incomeCategories
  accountId,       // cuenta donde entra la plata
  dayOfMonth,
  active,
}
```

### Comportamiento esperado
- Sección en Ajustes para "ingresos fijos", con el mismo patrón visual y
  de interacción que la sección de gastos fijos ya existente (lista,
  botón "+ nuevo ingreso fijo", modal de carga).
- Al abrir la app, si estamos en un mes nuevo y un ingreso fijo activo
  todavía no tiene un `entry` generado para ese mes, generarlo
  automáticamente como entry de tipo `income`, con el mismo flag
  `autoGenerated: true` y el mismo aviso de confirmación la primera vez
  que se auto-genera, siguiendo exactamente la misma lógica que ya existe
  para gastos fijos (reusar la función existente generalizándola para que
  sirva para ambos tipos, en vez de duplicar el código).

### Editar (nuevo, aplica también a gastos fijos si todavía no lo tiene)
- Cada ingreso/gasto fijo de la lista debe tener, además de "pausar" y
  "quitar", una opción **"editar"**: nombre, monto, categoría, cuenta y
  día del mes, con el mismo patrón de modal pre-poblado que se usó para
  la edición de movimientos y de cuentas en features anteriores.
- Si un ingreso/gasto fijo ya tiene entries `autoGenerated` de meses
  pasados, editarlo (ej. cambiar el monto porque aumentó el sueldo) debe
  afectar solo la generación de meses **futuros** — los entries ya
  generados en meses anteriores no se modifican retroactivamente, quedan
  como estaban con el monto vigente en el momento en que se generaron.
- Confirmar que esta misma opción de "editar" esté disponible también
  para gastos fijos si no se implementó todavía junto con la feature
  original de gastos recurrentes — deben tener paridad de funciones
  completa entre sí (crear, editar, pausar, eliminar, ambos).

### Pausar y eliminar
- Mismo comportamiento que gastos fijos: "pausar" marca `active: false`
  y detiene la auto-generación futura sin borrar el historial ya
  generado; "eliminar" quita el ingreso fijo de la lista (solo permitido
  si no tiene entries `autoGenerated` asociados, mismo criterio que ya
  aplica a categorías en uso — si tiene historial, ofrecer pausar en vez
  de bloquear silenciosamente).

### UI
- En el resumen mensual y en reportes, los ingresos autogenerados deben
  distinguirse visualmente igual que los gastos fijos autogenerados
  (mismo ícono pequeño indicador ya usado para `autoGenerated`).
- Si conviene por espacio, unificar "gastos fijos" e "ingresos fijos" en
  una misma sección de Ajustes con un toggle o pestañas internas
  ("gastos" / "ingresos") en vez de dos secciones separadas — usar
  criterio según cómo haya quedado la sección de gastos fijos hoy, sin
  romper su diseño actual.

### Casos de borde a probar
- Editar el monto de un ingreso fijo a mitad de mes, después de que ya
  se generó el entry automático de ese mes: el entry ya generado no debe
  cambiar; el mes siguiente sí debe usar el monto nuevo.
- Pausar un ingreso fijo y luego reactivarlo: la auto-generación debe
  retomar en el mes en curso al reactivarlo, no generar retroactivamente
  los meses que estuvo pausado.
- Ingreso fijo y gasto fijo con el mismo `dayOfMonth`: confirmar que
  ambos se generan correctamente sin pisarse en la misma corrida de
  auto-generación al abrir la app.
- Eliminar un ingreso fijo que tiene entries generados: debe bloquearse u
  ofrecer pausar, igual que el criterio ya usado para gastos fijos y
  categorías en uso.

### Notas de implementación
- Archivos modificados: `index.html`, `js/recurring.js`, `js/state.js`, `js/main.js`, `js/settings.js`
- `state.recurringIncomes[]` nuevo, mismo shape que `recurringExpenses`. Migración en `loadState()`. Incluido en `clearAllData()` e `handleImportFile()`.
- `processRecurring(list, entryType)` función interna genérica; `processRecurringExpenses()` (nombre intocable, llamada desde `main.js`) ahora llama a ambas listas y muestra un único toast combinado.
- `renderRecurringRows(container, list, entryType)` función compartida para gastos e ingresos. Cada fila tiene tres acciones: **editar**, **pausar/activar**, **quitar**.
- "Quitar" con historial: si el recurrente ya tiene entries `autoGenerated`, muestra un `confirm` con opción de pausar o eliminar (en vez de bloquear silenciosamente). Si elige pausar, marca `active: false`; si elige eliminar, confirma una vez más y quita solo la definición — los entries históricos quedan intactos.
- Modal reutilizado (`recurring-modal-backdrop`): título y texto del botón guardar se actualizan dinámicamente. La grilla de categorías muestra `state.incomeCategories` cuando `editingRecurringType === 'income'`.
- `pendingRecurringData` ahora persiste también `recurringType` y `editingRecurringId` para restaurar correctamente el contexto modal después de crear una nueva cuenta.
- Nueva sección "ingresos fijos" en Ajustes con `#recurring-income-manager` y botón `#btn-add-recurring-income`, debajo de "gastos fijos".
- Gastos fijos ahora también tienen "editar" (paridad de funciones con ingresos fijos).

---

## FEATURE: Módulo de ahorro en dólares
**Estado: hecha**

### Concepto
El usuario quiere poder separar una porción de su sueldo u otros ingresos
como "ahorro en dólares", que:
- No figure como gasto de consumo en el libro de caja mensual (no debe
  mezclarse visualmente con gastos normales, aunque sí reduzca el saldo
  de la cuenta de origen — ver más abajo).
- Quede en una sección separada de ahorro, con el monto en USD y su
  equivalente en pesos al tipo de cambio cargado.
- Tenga una cuenta de origen (de dónde sale la plata en pesos).
- Sea visible en la pestaña de Metas o en una sub-sección dentro de ella.

### Modelo de datos
Nueva entidad `dollarSavings`: array de objetos:
```
{
  id,
  date,               // ISO, fecha del depósito
  amountUSD,          // monto en dólares (lo que realmente se ahorra)
  amountARS,          // monto en pesos que salió de la cuenta de origen
  exchangeRate,       // tipo de cambio usado (ARS por USD)
  sourceAccountId,    // cuenta de donde salió la plata
  note,               // opcional
  goalId,             // opcional: si se vincula a una meta de ahorro
                      // existente (de la entidad goals ya existente)
}
```

### Tipo de cambio
- El usuario carga el tipo de cambio manualmente al registrar cada
  depósito (input numérico en el modal, ej. "1 USD = $ 1.250"). Si la
  feature de "cotización del dólar automática" de este mismo backlog ya
  está implementada, pre-completar con ese valor en vez de dejarlo vacío.
- Guardar un historial de tipos de cambio usados en `exchangeRates`:
  `{ date, rate }` — así se puede ver la evolución histórica.
- Mostrar siempre tanto el monto en USD como el equivalente en ARS
  calculado, con etiqueta clara de la moneda (nunca solo "$" sin aclarar).
- El último tipo de cambio usado debe pre-completarse como sugerencia la
  próxima vez que se abra el modal (el usuario lo confirma o modifica).

### Efecto sobre el balance mensual
Registrar también una salida en `state.entries` de tipo `expense` con
categoría especial `ahorro-usd` (ícono 💵, nombre "Ahorro USD") para que
el flujo de caja del mes refleje que esa plata "salió" de la cuenta de
origen. Pero en los reportes, separar visualmente este ítem del resto de
los gastos (ej. con una línea o sección distinta) para que quede claro que
no es un gasto de consumo sino un movimiento de ahorro.

### UI del módulo de ahorro USD
- Agregar una sub-sección "ahorro en dólares" dentro de la pestaña Metas
  (no crear una pestaña nueva).
- Mostrar: total acumulado en USD, equivalente en ARS al último tipo de
  cambio, y listado de depósitos con fecha, monto USD, monto ARS y cuenta
  de origen.
- Botón "+ depositar" que abre un modal pidiendo: monto en USD, tipo de
  cambio (pre-completado), cuenta de origen (selector de cuentas
  existentes), nota opcional, y opcionalmente vinculación a una meta de
  ahorro existente.
- El monto en ARS se calcula automáticamente en tiempo real mientras el
  usuario tipea (amountUSD × exchangeRate), mostrándose debajo del campo
  de tipo de cambio antes de guardar.

### Casos de borde a probar
- Depósito vinculado a una meta (`goalId`): confirmar que el progreso de
  esa meta se actualiza correctamente y no se cuenta doble si el usuario
  también suma fondos manualmente desde la vista de Metas.
- Tipo de cambio en 0 o vacío: no debe permitir guardar sin ese dato
  (rompería el cálculo de ARS).
- Cuenta de origen eliminada después de haber registrado depósitos desde
  ella: el depósito histórico no debe romperse, mostrar el nombre de
  cuenta guardado o "cuenta eliminada" en vez de fallar.

### Notas de implementación
- Archivos modificados: `index.html`, `styles.css`, `js/goals.js`, `js/state.js`
- Entidades nuevas: `state.dollarSavings[]` y `state.exchangeRates[]` con defaults en `loadState()`.
- Cada depósito crea automáticamente un entry en `state.entries` de tipo `expense` con `categoryId: 'ahorro-usd'`.
- `getCategoryById('ahorro-usd')` retorna `{ id, name: 'Ahorro USD', icon: '💵' }` como caso especial (no se agrega a `state.categories`).
- `renderGoals()` siempre llama a `renderDollarSavings(body)` al final, incluso cuando no hay metas.
- `renderCategoryBars()` en stats separa visualmente la categoría `ahorro-usd` del resto.

---

## FEATURE: Cotización del dólar automática
**Estado: hecha** desde una API
pública gratuita (ej. DolarAPI — `https://dolarapi.com/v1/dolares` — u
otra equivalente que no requiera API key), en vez de que el usuario tenga
que cargar el tipo de cambio a mano cada vez.

### Comportamiento esperado
- Al abrir el modal de "depositar ahorro en USD" (ver módulo de ahorro en
  dólares, si ya está implementado), intentar traer la cotización actual
  automáticamente y pre-completar el campo de tipo de cambio con ese
  valor, dejándolo editable por si el usuario quiere ajustarlo a mano
  (ej. porque usó una casa de cambio distinta).
- Mostrar de qué tipo de dólar es la cotización traída (blue, oficial,
  MEP — la API elegida probablemente devuelve varios tipos; usar "blue"
  como default razonable para Argentina, pero dejar que el usuario elija
  cuál usar si la API lo permite).
- Si la request falla (sin internet, API caída), degradar con gracia: no
  romper el modal, simplemente dejar el campo vacío o con el último valor
  usado guardado en `exchangeRates`, y mostrar un aviso breve tipo "no se
  pudo traer la cotización, ingresala manualmente".
- Cachear la última cotización obtenida con su fecha/hora, para no hacer
  una request nueva cada vez que se abre el modal en el mismo día — solo
  refrescar si pasaron más de, por ejemplo, 30 minutos desde la última
  consulta exitosa.

### Casos de borde a probar
- Sin conexión a internet: el modal debe seguir siendo usable con carga
  manual.
- Abrir el modal dos veces seguidas en poco tiempo: no debe hacer dos
  requests innecesarias, debe usar el caché.
- La API devuelve un formato inesperado o error 500: no debe romper el
  JS de toda la página, solo fallar silenciosamente ese fetch puntual.

### Notas de implementación
- Archivos modificados: `index.html`, `styles.css`, `js/goals.js`, `sw.js`
- Cache de sesión en variable de módulo `rateCache { rates, timestamp }` (TTL 30 min). No persiste en localStorage — se refresca al recargar la app, que es el comportamiento deseable.
- API: `https://dolarapi.com/v1/dolares` (sin API key). Se usa el campo `venta` de cada tipo.
- Tipos mostrados: Blue (default), Oficial, MEP (`casa: 'bolsa'`), Tarjeta. Solo aparecen los que la API devuelve.
- Al elegir un tipo con los chips, se reemplaza el valor en el input y se recalcula el preview ARS.
- Si la API falla: se deja el último TC manual del historial o el campo vacío, y se muestra "sin conexión · ingresá el TC manualmente" en rojo.
- El input sigue siendo editable siempre; la cotización automática es solo una sugerencia.
- SW bumpeado a `libro-de-caja-v5` para forzar recarga de archivos nuevos.

---

## FEATURE: Proyección de fin de mes y gastos hormiga
**Estado: hecha**

### Qué se pide
Dos métricas nuevas en la vista de Reportes:

1. **Proyección de fin de mes**: basado en el promedio diario de gasto
   hasta la fecha actual del mes en curso, proyectar cuánto se va a
   gastar en total si el ritmo se mantiene igual el resto del mes.
   Fórmula: `(gastoAcumuladoHastaHoy / díasTranscurridos) * díasTotalesDelMes`.
   Mostrar esta proyección comparada con el presupuesto total (si el
   usuario tiene presupuestos por categoría configurados, sumar todos
   para tener un "presupuesto total implícito" de referencia) — si la
   proyección supera el presupuesto/lo gastado el mes anterior, destacarlo
   con el color de alerta (terracota).

2. **Gastos hormiga**: sumar todos los movimientos de tipo `expense` del
   mes en curso cuyo `amount` sea menor a un umbral configurable (default
   $5.000, editable desde Ajustes), y mostrar el total agrupado como una
   métrica nueva, con la cantidad de movimientos que lo componen (ej.
   "$47.300 en 23 gastos chicos este mes"). Idealmente, también desglosar
   estos gastos hormiga por categoría, para que el usuario vea en qué se
   le va la plata "de a poco".

### Dónde mostrarlas
Agregar ambas como tarjetas nuevas en el `metric-grid` ya existente en
la vista de Reportes, siguiendo el mismo estilo visual que las métricas
actuales (promedio diario, tasa de ahorro, etc.).

### Casos de borde a probar
- Mes recién empezado (día 1 o 2): la proyección con pocos datos puede
  ser poco confiable — considerar mostrar un aviso tipo "proyección
  preliminar" los primeros días del mes, o requerir un mínimo de días
  transcurridos (ej. 3) antes de mostrar la proyección con confianza.
- Mes sin ningún gasto todavía: no debe romper (división por cero).
- Umbral de gasto hormiga editado por el usuario a un valor absurdo
  (negativo, cero): validar el input.

### Notas de implementación
- Archivos modificados: `js/state.js`, `js/stats.js`, `js/settings.js`, `js/main.js`, `index.html`, `styles.css`.
- Nuevo campo `state.smallExpenseThreshold` (default 5000). Migración en `loadState()` y reset en `clearAllData()` / `handleImportFile()`.
- Proyección: se muestra `—` si `daysElapsed < 3` o si no hay gastos (evita división por cero y proyecciones sin sentido). Referencia de alerta: suma de todos los `budgets.monthlyLimit` si hay presupuestos configurados; si no, gasto del mes anterior. Texto `.negative` (terracota) si la proyección supera la referencia.
- Gastos hormiga: excluye categoría `ahorro-usd` (no es un gasto de consumo). El conteo y monto se muestran como subtexto dentro del metric-card con la clase `.metric-sub` (nueva clase CSS).
- Desglose por categoría: sección `#ants-section-label` con `hidden` por defecto, solo visible si hay gastos hormiga ese mes. Las barras muestran cantidad de movimientos en vez de porcentaje secundario, ya que el dato relevante aquí es la frecuencia.
- Umbral configurable en Ajustes bajo la nueva sección "umbrales", reutilizando el layout `.inflation-row` y `.inflation-input`.
- Caso de borde: umbral negativo o cero validado en `saveSmallExpenseThreshold()`.

---

## FEATURE: Actualizaciones automáticas del Service Worker (PWA update flow)
**Estado: hecha**

### Problema
Cada vez que se hace push de un cambio (commit → Netlify redeploy), el
Service Worker (sw.js) sigue sirviendo la versión vieja cacheada en los
dispositivos ya instalados, hasta que el usuario fuerza un refresh o
reinstala. Esto obliga a intervención manual cada vez que hay un cambio,
lo cual no es viable a largo plazo.

### Qué se pide
Implementar el patrón estándar de detección de Service Worker nuevo +
aviso no invasivo al usuario para que decida cuándo aplicar la
actualización.

### Comportamiento esperado
- Cuando el navegador detecta que hay una versión nueva del SW disponible
  (evento `updatefound` + nuevo worker llega a estado `installed` mientras
  ya hay uno `activated` controlando la página), mostrar un banner fijo en
  la parte inferior con el texto "Hay una versión nueva disponible" y
  un botón "Actualizar" + X para ignorar.
- Al tocar "Actualizar": `postMessage({type:'SKIP_WAITING'})` al SW
  esperando, y en `sw.js` escuchar ese mensaje y llamar a
  `self.skipWaiting()`. Cuando el nuevo SW toma control
  (`controllerchange`), hacer `window.location.reload()`.
- Si el usuario ignora el aviso, la app sigue funcionando normalmente.
- En primera instalación (sin SW previo), no mostrar ningún aviso.

### Casos de borde a probar
- Primer uso (sin SW previo): no debe aparecer el banner.
- Cambio desplegado → abrir app → verificar que aparece el banner.
- Tocar "Actualizar" → app recarga con versión nueva.
- Ignorar el banner → app sigue usable normalmente.

### Notas de implementación
- Archivos modificados: `sw.js`, `index.html`, `styles.css`, `_headers` (nuevo)
- `sw.js`: eliminado `self.skipWaiting()` del install; agregado listener
  `message` que lo llama solo cuando recibe `{type:'SKIP_WAITING'}`.
- `index.html`: inline script de registro ampliado — detecta `updatefound`,
  espera `statechange === 'installed'` con `navigator.serviceWorker.controller`
  activo (no primera instalación), muestra el banner. `controllerchange`
  recarga solo si `reloadOnControllerChange` es true (evita reload
  espurio en primer install).
- `_headers` (Netlify): `sw.js` con `Cache-Control: no-store` — crítico
  para iOS Safari, que de otro modo cachea el archivo SW a nivel HTTP y
  nunca detecta actualizaciones.
- CACHE_NAME bumpeado a `libro-de-caja-v7`.

---

## FEATURE: Transferencias entre cuentas
**Estado: hecha**
**Depende de: "Edición de cuentas y saldo inicial" (usa el saldo por cuenta)**

(Nota: si esta feature ya fue implementada en una sesión anterior de
Claude Code, marcar como `hecha` directamente y agregar la nota de
implementación correspondiente en vez de reimplementarla.)

### Qué se pide
Poder registrar el movimiento de plata de una cuenta a otra (ej. "pasé
$50.000 de Banco a Mercado Pago") sin que cuente como gasto ni como
ingreso en el balance mensual.

### Modelo de datos
Nueva entidad `transfers`: `{id, date, amount, fromAccountId,
toAccountId, note, createdAt}`.

### Efecto sobre saldos
Reduce el saldo de `fromAccountId` y aumenta el de `toAccountId` en el
mismo monto. No genera ningún entry en `state.entries`.

### UI
Modal simple: monto, cuenta origen, cuenta destino (no pueden ser la
misma), fecha, nota opcional. En el detalle de saldo por cuenta, las
transferencias aparecen como líneas con ícono ↔.

### Casos de borde a probar
- Intentar transferir de una cuenta a sí misma: debe bloquearse con
  mensaje claro.
- Transferir más plata de la que la cuenta origen "tiene" según el saldo
  calculado: permitir igual (la app no impide saldos negativos en
  efectivo/otras cuentas, es información del usuario) pero considerar un
  aviso visual suave, no un bloqueo duro.

### Notas de implementación
- Archivos modificados: `js/state.js`, `js/transfers.js` (nuevo), `js/ledger.js`, `js/ui.js`, `js/settings.js`, `js/main.js`, `index.html`, `styles.css`, `sw.js`
- Nueva entidad `state.transfers[]` con migración en `loadState()`, `clearAllData()` e `handleImportFile()`.
- `getAccountBalance()` en `state.js` ahora suma transferencias entrantes y resta salientes, con filtro por fecha igual que entries.
- `getTransfersForMonth(date)` nueva función helper en `state.js`.
- `js/transfers.js` nuevo archivo de dominio: `openTransferModal`, `closeTransferModal`, `saveTransfer`, `renderTransferRow`, grids de cuenta separados para origen y destino.
- Las transferencias NO generan entries en `state.entries` — solo viven en `state.transfers`.
- En `renderLedger()`, cuando el filtro es "all", las transferencias del mes se mezclan con los entries en la misma agrupación por fecha, cada una con `renderTransferRow()` (ícono ↔, color neutro `var(--ink-faint)`).
- En `renderAccountBreakdown()`: si hay 2+ cuentas, muestra el botón `#btn-open-transfer` (punteado, discreto) debajo del desglose de saldos. Con 1 cuenta sola, el botón permanece oculto.
- Mismo origen = mismo destino: bloqueado con toast.
- Saldo negativo tras transferencia: `confirm()` suave (no bloqueo duro).

---

## FEATURE: Gastos compartidos con división
**Estado: pendiente**

### Qué se pide
Poder marcar un gasto como "compartido" y registrar cómo se divide, para
saber cuánto le corresponde pagar/reembolsar a cada parte. Pensado para
uso con otra persona (pareja, amigo, compañero de viaje) sin necesidad de
que esa persona tenga la app instalada — es un registro informativo, no
una sincronización real entre dos instalaciones.

### Modelo de datos
Extender `entries` con un campo opcional `split`:
```
{
  enabled: true,
  otherPartyName: "Ana",
  splitType: "equal" | "custom",
  myShare: 10000,       // lo que le corresponde pagar al usuario
  otherShare: 10000,    // lo que le corresponde a la otra persona
  settled: false,       // si ya se saldó la diferencia
}
```

### Comportamiento esperado
- En el modal de carga de gasto, un toggle opcional "gasto compartido".
  Al activarlo, aparecen campos para nombre de la otra persona y tipo de
  división (50/50 automático, o montos personalizados que deben sumar el
  total del gasto).
- El monto total del gasto sigue impactando el balance del usuario como
  siempre (porque es plata que efectivamente salió de su cuenta), pero se
  muestra con una indicación visual (ej. un ícono de "compartido" en el
  listado) y la porción `otherShare` como "a cobrar".
- Nueva sub-vista (puede ir dentro de Reportes o como sección aparte)
  listando todos los gastos compartidos no saldados (`settled: false`),
  agrupados por `otherPartyName`, con el total a favor del usuario por
  persona. Botón para marcar como "saldado" cuando la otra persona
  devuelve la plata.

### Casos de borde a probar
- División personalizada donde los montos no suman el total del gasto:
  validar y no permitir guardar hasta que cierre la cuenta.
- Marcar como saldado: debe quedar registrado pero no debe borrar el
  gasto original del historial.

---

## FEATURE: Etiquetas libres en movimientos
**Estado: pendiente**

### Qué se pide
Además de la categoría (fija, de una lista predefinida), poder agregar
etiquetas libres de texto a cualquier movimiento — por ejemplo "viaje
Bariloche", "cumple de Juan" — para poder filtrar/agrupar gastos que
cruzan varias categorías pero pertenecen a un mismo evento o proyecto.

### Modelo de datos
Campo nuevo en `entries`: `tags: []` (array de strings). Nueva entidad
`allTags` derivada (no necesita persistirse aparte, se puede calcular
recorriendo `entries`) para autocompletar etiquetas ya usadas.

### Comportamiento esperado
- Campo de texto en el modal de carga de movimiento, tipo "chips": el
  usuario escribe una etiqueta y la confirma (Enter o botón +), se
  agrega como chip removible. Autocompletar sugiriendo etiquetas ya
  usadas anteriormente mientras tipea.
- En Reportes, agregar un filtro por etiqueta que muestre el total
  gastado bajo esa etiqueta en el rango de fechas seleccionado,
  independientemente de las categorías involucradas.

### Casos de borde a probar
- Etiquetas con mayúsculas/minúsculas inconsistentes (ej. "Viaje" vs
  "viaje") — normalizar a minúsculas para evitar duplicados lógicos,
  pero mostrar con capitalización agradable en pantalla.
- Movimiento con muchas etiquetas: que el chip input no rompa el layout
  del modal en pantallas chicas.

---

## FEATURE: Resumen semanal automático
**Estado: pendiente**

### Qué se pide
Una vista (o notificación, si el navegador lo permite) que se genera
automáticamente cada domingo (o al abrir la app por primera vez después
del domingo) con un resumen de la semana: total gastado, comparación vs
la semana anterior, top 3 categorías de la semana, y si se mantuvo la
racha de carga diaria.

### Comportamiento esperado
- Guardar en `state` la fecha del último resumen semanal mostrado
  (`lastWeeklySummaryShown`). Al abrir la app, si pasó una semana desde
  ese registro y hoy es domingo o más tarde, mostrar el resumen (como una
  vista o modal informativo, no bloqueante — con botón para cerrar).
- Contenido: gasto total de la semana (lunes a domingo), diferencia
  porcentual vs la semana anterior, las 3 categorías con mayor gasto de
  la semana, y cuántos de los 7 días se cargó al menos un movimiento.

### Casos de borde a probar
- Primera semana de uso de la app (sin semana anterior para comparar):
  no mostrar el porcentaje de comparación, o mostrar "sin datos previos".
  No debe generar un error.
- Usuario que no abre la app varios domingos seguidos: al volver a
  entrar, mostrar solo el resumen de la semana más reciente completa, no
  acumular varios resúmenes atrasados.

---

## Ideas sin desarrollar todavía (para agregar como feature completa más adelante)

- Backup automático a Google Drive del usuario (sin backend propio)
- Comparativa año contra año (ej. junio 2026 vs junio 2025)
- Score de salud financiera combinando tasa de ahorro + presupuestos +
  racha
- Fecha estimada para alcanzar cada meta de ahorro según ritmo actual de
  depósitos
- Simulador de escenarios en el módulo Plan ("¿y si aporto más por mes?")
- Foto de comprobante adjunta a un movimiento (base64 local)
- PIN o bloqueo biométrico al abrir la app

## FEATURE: Recordatorio de conciliación periódica
**Estado: pendiente**

### Qué se pide
Un aviso proactivo cada 2 semanas invitando al usuario a revisar si el
saldo calculado de sus cuentas coincide con la realidad, para que el
ajuste de saldo (feature ya existente) sea algo que se hace de forma
regular y a propósito, en vez de descubrirse por sorpresa cuando ya hay
una diferencia grande acumulada.

### Modelo de datos
Campo nuevo en `state`: `lastReconciliationPrompt` (fecha ISO de la
última vez que se mostró este aviso, o `null` si nunca se mostró).

### Comportamiento esperado
- Al abrir la app, calcular cuántos días pasaron desde
  `lastReconciliationPrompt` (o desde la primera vez que se usó la app,
  si el campo es `null` — usar la fecha del primer `entry` cargado como
  referencia de inicio).
- Si pasaron 14 días o más, mostrar un aviso no bloqueante (mismo patrón
  visual que el banner de sugerencias ya existente, o el mismo banner de
  sugerencias reusado como un caso más de `computeSuggestion()`) del
  tipo: "¿Hace cuánto no revisás el saldo de tus cuentas? Un chequeo
  rápido evita sorpresas." con un botón o link que lleve directo a la
  vista de cuentas donde están los ajustes de saldo.
- Al mostrarse el aviso (se haya actuado o no sobre él), actualizar
  `lastReconciliationPrompt` a la fecha de hoy, para que no vuelva a
  aparecer hasta pasar otras 2 semanas — no depende de que el usuario
  haga el ajuste, solo de que haya pasado el tiempo, para no ser
  insistente si decide ignorarlo una vez.
- Si el usuario ya hizo un ajuste de saldo en cualquier cuenta dentro de
  los últimos 14 días (sin necesidad del aviso), no mostrar el
  recordatorio — ya está conciliando por su cuenta.

### Casos de borde a probar
- Primera vez que se usa la app (sin `entries` todavía): no debe
  aparecer el aviso hasta que haya al menos algo cargado y pasen los 14
  días correspondientes.
- Usuario que ajusta saldo seguido (cada pocos días): el aviso no debe
  aparecer nunca en ese caso, ya que la condición de "sin ajustes en los
  últimos 14 días" no se cumple.
- No debe competir ni superponerse con otras sugerencias del banner
  existente — si ya hay una sugerencia mostrándose ese día, definir
  prioridad clara entre sugerencias (esto puede coordinarse con el resto
  de casos ya existentes en `computeSuggestion()`, por ejemplo dando
  prioridad a avisos más urgentes como el de racha por cortarse).

---
## FEATURE: Historial de ajustes por cuenta
**Estado: pendiente**
**Depende de: "Edición de cuentas y saldo inicial" (ya implementada)**

### Qué se pide
En el detalle de cada cuenta (dentro de Ajustes o donde se gestionen las
cuentas), mostrar cuántas veces se ajustó el saldo de esa cuenta
específica y de cuánto fue cada ajuste, para que el usuario pueda
detectar patrones — por ejemplo, si siempre es la misma cuenta (típico:
efectivo) la que requiere corrección, es una señal de que ahí se le
escapan más gastos sin cargar.

### Comportamiento esperado
- En la vista de detalle/edición de una cuenta, agregar una sección
  "historial de ajustes" listando todos los `entries` de tipo
  `adjustment` asociados a esa cuenta (filtrar por `accountId`), con
  fecha y monto de cada uno (positivo o negativo).
- Mostrar un resumen arriba de la lista: cantidad total de ajustes
  hechos en esa cuenta y la suma acumulada (en valor absoluto, para
  responder "¿cuánto termine perdiendo/ganando de rastro en esta
  cuenta en total?").
- Si la cuenta nunca tuvo ajustes, mostrar un estado vacío simple ("sin
  ajustes registrados en esta cuenta") en vez de una sección rota o
  confusa.
- Opcional pero recomendable: si hay más de una cuenta con ajustes, en
  algún lugar (puede ser la misma vista de cuentas) destacar cuál es la
  cuenta con más ajustes acumulados, como una forma pasiva de que el
  usuario note el patrón sin tener que comparar manualmente cuenta por
  cuenta.

### Casos de borde a probar
- Cuenta eliminada que tenía ajustes históricos: definir criterio
  consistente con el resto de la app (mismo tratamiento que ya se usa
  para movimientos de cuentas eliminadas en otras partes, si existe).
- Cuenta con muchísimos ajustes (edge case de uso intensivo): que la
  lista no rompa el layout, considerar scroll interno si crece mucho.

---
## FEATURE: Subcategorías
**Estado: hecha**
**Depende de: "Edición de categorías" (recomendable tenerla implementada antes)**

### Qué se pide
Permitir que una categoría tenga subcategorías opcionales — por ejemplo
"Comida" con subcategorías "Supermercado", "Delivery" y "Restaurantes" —
para poder analizar el gasto con más detalle sin tener que inflar la
lista principal de categorías con decenas de ítems sueltos.

### Modelo de datos
Extender el objeto de categoría (`state.categories` y
`state.incomeCategories`) con un campo opcional:
```
{
  id, name, icon,
  subcategories: [
    { id, name }
  ]
}
```
Si `subcategories` está vacío o no existe, la categoría se comporta
exactamente igual que hoy (retrocompatible con todas las categorías
existentes, que no tienen por qué migrar a tener subcategorías).

Extender `entries` con un campo opcional `subcategoryId` (puede ser
`null` si el movimiento no especifica subcategoría, incluso si la
categoría elegida sí las tiene definidas — no debe ser obligatorio
elegir una).

### Comportamiento esperado
- En el gestor de categorías de Ajustes, cada categoría puede tener
  subcategorías gestionables (agregar/editar/quitar), con una UI simple
  anidada bajo la categoría padre.
- En el modal de carga de movimiento, al elegir una categoría que tiene
  subcategorías definidas, mostrar un selector adicional (opcional, no
  bloqueante) para elegir la subcategoría. Si la categoría no tiene
  subcategorías, no mostrar nada extra — mantener el flujo actual
  intacto para quien no usa esta feature.
- En Reportes, al ver el desglose de una categoría con subcategorías,
  permitir un nivel de detalle adicional (ej. tocar la barra de "Comida"
  despliega el desglose por subcategoría) sin romper la vista general
  por categorías que ya existe.

### Casos de borde a probar
- Categoría con subcategorías que luego se editan/eliminan: los
  movimientos que ya usaban una subcategoría eliminada no deben romperse
  — mostrar el nombre guardado históricamente o "subcategoría eliminada"
  en vez de fallar.
- Usuario que nunca usa subcategorías: la app debe verse y comportarse
  exactamente igual que antes de esta feature, sin UI adicional
  molestando si no la necesita.
- Categorías de ingreso también deben poder tener subcategorías, mismo
  criterio que las de gasto.

### Notas de implementación
- Archivos modificados: `js/state.js`, `js/settings.js`, `js/ledger.js`, `js/stats.js`, `js/main.js`, `index.html`, `styles.css`, `sw.js`
- `state.categories` y `state.incomeCategories` extendidas con `subcategories: []` (migración en `loadState()`). Campo retrocompatible — si está vacío la UI no muestra nada extra.
- `getSubcategoryById(catId, subcatId, type)` en `state.js`.
- En Ajustes, la sección de subcategorías aparece SOLO en modo edición (no al crear una categoría nueva). Agregar/quitar subcategorías es inmediato (save instantáneo); nombre+ícono de la categoría padre requieren "guardar cambios" como antes.
- `selectedSubcategoryId` (global en state.js) se resetea cuando cambia la categoría o el tipo (gasto/ingreso). Se restaura en `openEditModal()`.
- `renderSubcategoryGrid()` se llama al final de `renderCategoryGrid()`. El campo `#subcategory-field` permanece oculto si la categoría seleccionada no tiene subcategorías definidas. Chip "—" permite limpiar la selección.
- `subcategoryId` se guarda en entries (null si no aplica). `renderEntryRow()` muestra el nombre de la subcategoría en el subtítulo antes de la nota.
- En Reportes, botón "▸ ver por subcategoría" aparece debajo de la barra de categoría solo si hay entries con subcategoryId para esa categoría ese mes. Expandible con toggle.
- Subcategoría eliminada: `getSubcategoryById()` retorna null → simplemente no se muestra en el subtítulo (no rompe). Los entries con subcategoryId huérfano quedan intactos.

---
## FEATURE: Sugerencia automática de categoría según la nota
**Estado: hecha**
**Depende de: "Subcategorías" (opcional — si no está implementada, esta feature funciona igual solo con categorías, ignorando el paso de subcategoría)**

### Qué se pide
Que la app aprenda de las notas que el usuario ya escribió en
movimientos anteriores, y sugiera automáticamente una categoría cuando
detecta una palabra que ya usó antes junto a esa misma categoría — por
ejemplo, si varias veces cargó un gasto con la nota "uber" y eligió la
categoría "Transporte", la próxima vez que escriba "uber" en la nota, la
app sugiere "Transporte" automáticamente antes de que el usuario elija a
mano. Si la categoría sugerida tiene subcategorías (ver feature
"Subcategorías"), sugerir también la subcategoría más probable, en un
segundo paso dependiente de la categoría ya sugerida — nunca de forma
independiente entre sí.

### Cómo funciona el aprendizaje (sin backend, todo local)
- No hace falta una entidad nueva separada: esta información se puede
  derivar directamente de `state.entries` cada vez que se necesite (no
  hay que mantener un modelo entrenado ni nada persistido aparte), pero
  por performance conviene cachear el resultado en memoria y
  recalcularlo solo cuando se agrega o edita un movimiento, no en cada
  tecla que el usuario tipea.
- Algoritmo simple: tomar las palabras de la nota (en minúsculas, sin
  tildes, separadas por espacios, ignorando palabras muy cortas o muy
  genéricas tipo "de", "el", "la"), y por cada palabra llevar un conteo
  de con qué categoría apareció más veces en el historial. Cuando el
  usuario tipea una nota nueva, buscar si alguna palabra de lo que ya
  escribió coincide con alguna palabra "aprendida", y si hay una
  categoría claramente dominante para esa palabra (ej. apareció con esa
  categoría más del 70% de las veces, con un mínimo de 2-3 apariciones
  para no sugerir en base a un solo caso aislado), sugerirla.

### Aprendizaje de subcategoría (en dos pasos, dependiente de la categoría)
- Una vez determinada la categoría sugerida para la palabra (con el
  algoritmo de arriba), repetir el mismo tipo de análisis pero
  **filtrando solo los movimientos históricos que ya pertenecen a esa
  categoría**: de esos, ver con qué subcategoría apareció más
  frecuentemente esa misma palabra, con el mismo criterio de confianza
  mínima (ej. >70% de las veces, con mínimo de 2-3 apariciones dentro de
  ese subconjunto ya filtrado por categoría).
- La subcategoría sugerida debe pertenecer siempre a la categoría ya
  sugerida — nunca se aprende ni se sugiere una combinación
  palabra→categoría y palabra→subcategoría de forma independiente entre
  sí, precisamente para evitar sugerir una subcategoría que no tiene
  sentido bajo la categoría elegida (ej. sugerir categoría "Transporte"
  pero subcategoría "Delivery", que pertenece a "Comida").
- Si la categoría sugerida no tiene subcategorías definidas, o no hay
  suficiente historial para determinar una subcategoría con confianza,
  simplemente no sugerir ninguna — sugerir solo la categoría es un
  resultado válido y esperado, no un caso de error.

### Comportamiento esperado
- En el modal de carga de movimiento, mientras el usuario escribe en el
  campo de nota, si se detecta una coincidencia con suficiente
  confianza, resaltar visualmente (no seleccionar automáticamente sin
  avisar) la categoría sugerida en el grid de categorías — por ejemplo
  con un borde o indicador sutil, y/o un texto chico tipo "sugerido:
  Transporte" cerca del campo de nota. Si también hay subcategoría
  sugerida, mostrarla de la misma forma una vez que el selector de
  subcategoría esté visible (que aparece al elegir/confirmar la
  categoría, según el comportamiento ya definido en la feature de
  Subcategorías).
- El usuario sigue teniendo el control total: la sugerencia es una
  ayuda visual, nunca selecciona la categoría ni la subcategoría de
  forma automática sin que el usuario confirme tocándola.
- El aprendizaje debe ser continuo: cada movimiento nuevo que se carga
  refuerza o ajusta las asociaciones palabra-categoría (y
  palabra-subcategoría) para sugerencias futuras, sin necesidad de una
  etapa de "entrenamiento" separada ni configuración manual por parte
  del usuario.

### Casos de borde a probar
- Usuario nuevo sin historial suficiente: no debe sugerir nada hasta
  tener datos suficientes (mínimo de apariciones definido arriba), ni
  debe romper si `entries` está vacío.
- Palabra que aparece con distintas categorías en proporciones similares
  (sin un ganador claro, ej. 50/50): no sugerir nada en vez de adivinar
  con baja confianza.
- Palabras muy genéricas que aparecen en casi todos los movimientos (ej.
  "compra", "pago"): considerar una lista corta de palabras a ignorar
  por ser poco informativas, además del filtro de palabras muy cortas.
- Categoría con suficiente confianza pero sin suficiente historial dentro
  de esa categoría para determinar la subcategoría: debe sugerir solo la
  categoría, sin forzar una subcategoría de baja confianza.
- Feature de Subcategorías no implementada todavía, o categoría sin
  ninguna subcategoría definida: el flujo de sugerencia de categoría debe
  funcionar exactamente igual que si esta ampliación no existiera, sin
  errores ni referencias a subcategorías inexistentes.
- Rendimiento: con un historial grande de movimientos (cientos), el
  cálculo de sugerencias (categoría + subcategoría) no debe sentirse
  lento al escribir en el campo de nota — de ahí la importancia de
  cachear y no recalcular en cada tecla.

### Notas de implementación
- Nuevo archivo `js/suggestions.js` con: `_buildSuggestionCache()`, `_extractWords()`, `invalidateSuggestionCache()`, `getSuggestionForNote()`.
- Cache invalidada en `saveEntry()` (ambas ramas create/edit) via `invalidateSuggestionCache()`.
- Cache lazy: se reconstruye en el primer `getSuggestionForNote()` tras invalidación; comparación por `state.entries.length` como atajo rápido.
- Funciones públicas: `getSuggestionForNote(note, entryType)` → `{categoryId, subcategoryId} | null`; `invalidateSuggestionCache()`.
- `_applyActiveSuggestion()` y `onNoteInputSuggestion()` en `ledger.js`: aplican clase `.suggested` al chip via `data-cat-id`; muestran/ocultan `#category-suggestion-hint`.
- Sugerencia se limpia cuando el usuario hace click en cualquier chip (incluso el sugerido), dejando `_activeSuggestion = null`.
- `setEntryType()` también limpia `_activeSuggestion` porque cambia la lista de categorías válidas.
- `<p id="category-suggestion-hint">` añadido en HTML justo bajo `#input-note`.
- CSS: `.category-chip.suggested` con borde dashed acento; `.suggestion-hint` texto chico acento itálico.

---
## FEATURE: Carga rápida por texto libre
**Estado: hecha**
**Se potencia con: "Sugerencia automática de categoría según la nota" (si ya está implementada, reusar esa misma lógica de aprendizaje)**

### Qué se pide
Una forma alternativa y más rápida de cargar un movimiento: el usuario
escribe una frase corta en lenguaje natural (ej. "500 en nafta", "2000
supermercado", "cobré 50000 de sueldo") y la app interpreta
automáticamente el monto, si es gasto o ingreso, y sugiere la categoría,
sin tener que pasar por todos los campos del modal uno por uno.

### Comportamiento esperado
- Agregar un campo de texto libre, accesible por ejemplo con un ícono
  alternativo junto al botón + existente, o como una opción dentro del
  mismo modal de carga ("cargar rápido" vs. "cargar con detalle").
- Al escribir una frase y confirmar, la app debe:
  1. Extraer el monto: buscar el primer número en el texto (soportar
     formatos con y sin decimales, con puntos de miles si aplica).
  2. Determinar tipo (gasto/ingreso): usar palabras clave simples —
     "cobré", "recibí", "ingreso", "sueldo" sugieren ingreso; ausencia de
     esas palabras asume gasto por default (los gastos son la mayoría de
     los movimientos del día a día).
  3. Sugerir categoría: usando la misma lógica de aprendizaje por
     palabras de la feature de categorización automática si ya está
     implementada; si no, hacer un matching simple contra los nombres de
     categorías existentes (ej. si el texto contiene "nafta" o
     "transporte", sugerir la categoría Transporte por coincidencia
     directa de nombre — versión simplificada sin aprendizaje).
  4. El resto del texto (lo que no es el número) se guarda como nota.
- Antes de guardar definitivamente, mostrar una confirmación breve con lo
  interpretado (monto, tipo, categoría sugerida, nota) para que el
  usuario pueda corregir cualquier campo antes de confirmar — nunca
  guardar directamente sin mostrar qué se interpretó, para evitar cargar
  algo mal interpretado sin darse cuenta.
- Si no se puede interpretar un monto válido en el texto, mostrar un
  aviso claro pidiendo que lo intente de nuevo o use el modal completo,
  en vez de guardar algo incorrecto.

### Casos de borde a probar
- Texto sin ningún número: debe rechazarse con aviso claro, no debe
  guardar un monto de 0 o inventado.
- Texto con varios números (ej. "pagué 500 por 2 entradas"): definir un
  criterio simple y consistente sobre cuál número se toma como el monto
  (ej. el primero que aparece), y permitir que el usuario lo corrija
  fácilmente en la confirmación si tomó el número equivocado.
- Texto ambiguo sobre si es gasto o ingreso: default a gasto (más común
  en el uso diario) pero dejar bien visible y fácil de cambiar en la
  confirmación antes de guardar.

### Notas de implementación
- Nuevo archivo `js/quickadd.js`. Botón FAB secundario `.fab-quick` (⚡ icono rayo) posicionado a la izquierda del FAB principal.
- Regex de extracción: primer token `[\d]+(?:[.,][\d]+)*` en el texto. Parseo de monto: si tiene coma → dots=miles, coma=decimal; si punto seguido de exactamente 3 dígitos → dot=miles; de lo contrario dot=decimal.
- Detección de tipo: normalizado lowercase sin tildes, busca keywords de ingreso en `_INCOME_KEYWORDS`; default a gasto.
- Nota extraída = texto original minus el token de monto (incluyendo posible `$`).
- Preview se muestra en tiempo real al tipear (event `input`). Tipo y categoría son corregibles en el preview antes de guardar.
- Categoría auto-seleccionada si `getSuggestionForNote()` retorna resultado (>70% confianza). El usuario puede corregir tocando otro chip en el preview.
- Múltiples números en texto (ej. "pagué 500 por 2 entradas"): se toma el primero; el usuario puede corregir el amount en el campo editable del preview.
- Al guardar: llama `invalidateSuggestionCache()` igual que `saveEntry()` en el modal completo.

---
## FEATURE: Alerta de aporte del Plan sin registrar
**Estado: pendiente**
**Depende de: módulo "Plan" (inversiones/interés compuesto) ya implementado**

### Qué se pide
Igual que la racha del libro de caja avisa si estás por cortar el hábito
diario de carga, este aviso hace lo mismo pero para el módulo Plan: si ya
pasó la fecha esperada del aporte mensual (ej. Swiss Medical) y todavía no
se registró el pago de ese mes, avisar — para no perder de vista un
aporte real que sí se pagó pero no se cargó en la app, lo cual
distorsionaría la proyección de interés compuesto.

### Comportamiento esperado
- Cada plan de `investmentPlans` tiene un `startDate` y aportes mensuales
  esperados. Calcular, para el mes en curso, si ya debería existir un
  registro en `contributions` para ese plan y ese mes (usando el día del
  mes del `startDate` como referencia de "cuándo se espera el aporte", de
  forma similar a `dayOfMonth` en gastos/ingresos fijos).
- Si pasó esa fecha esperada y no hay un aporte registrado para el mes en
  curso, mostrar un aviso — puede integrarse al mismo banner de
  sugerencias general, o mostrarse específicamente dentro de la vista
  "Plan" como un indicador visual en la tarjeta del plan correspondiente
  (ej. un badge o borde de alerta en la tarjeta), sin necesidad de ser
  invasivo fuera de esa vista.
- El aviso debe incluir un acceso directo al botón "registrar pago de
  este mes" que ya existe en el módulo Plan, para resolverlo en un toque.

### Casos de borde a probar
- Plan recién creado, todavía dentro del primer mes (antes de que llegue
  la fecha esperada del primer aporte): no debe avisar prematuramente.
- Plan con aporte ya registrado ese mes: no debe aparecer ningún aviso.
- Varios planes activos simultáneamente, cada uno con su propia fecha
  esperada: el aviso debe evaluarse de forma independiente por plan, no
  global.

---
## FEATURE: Rendimiento real vs. proyectado en el Plan
**Estado: pendiente**
**Depende de: módulo "Plan" (inversiones/interés compuesto) ya implementado**

### Qué se pide
A medida que pasan los meses y se van registrando aportes reales, mostrar
en cada plan una comparación entre lo que la fórmula de interés compuesto
predecía para este punto en el tiempo y el valor acumulado real (aportes
+ interés generado hasta la fecha), para que el usuario pueda ver si el
plan está evolucionando como se esperaba.

### Comportamiento esperado
- Para cada plan, calcular dos valores a la fecha de hoy:
  1. **Proyectado**: lo que la fórmula de interés compuesto predice que
     debería haber acumulado a esta altura, dados los meses transcurridos
     desde `startDate` y la tasa `annualRatePct` (mismo cálculo ya usado
     para la proyección a término, pero evaluado a "hoy" en vez de al
     final del plazo completo).
  2. **Real**: la suma de aportes efectivamente registrados en
     `contributions` (en USD) más el interés que esos aportes
     efectivamente generaron según las fechas reales en que se
     cargaron (no asumir que todos los meses se aportó puntualmente si
     hubo meses sin registrar, ver feature de alerta de aporte sin
     registrar).
- Mostrar ambos valores lado a lado en la tarjeta del plan (ej.
  "proyectado a la fecha: USD X" / "acumulado real: USD Y"), y la
  diferencia entre ambos, con indicación visual de si está por encima o
  por debajo de lo esperado (colores ya usados en la app: oliva si va
  bien, terracota si está por debajo).
- Si hay meses sin aporte registrado (ver feature de alerta), la
  diferencia entre proyectado y real va a reflejar naturalmente esa
  falta, lo cual es información correcta y esperada, no un error de
  cálculo — no hay que "perdonar" esos meses en el cálculo del valor
  real.

### Casos de borde a probar
- Plan recién creado sin aportes todavía: el valor real debe ser 0, sin
  errores de cálculo, y el proyectado debe reflejar 0 días transcurridos
  (no debe mostrar una proyección inflada de meses que no pasaron).
- Plan con todos los aportes puntuales: proyectado y real deberían
  coincidir bastante de cerca (pequeñas diferencias por redondeo son
  esperables, no un bug).
- Plan con varios meses sin aportar: la diferencia debe ser visible y
  clara, sin romper el resto de la tarjeta.

---
## FEATURE: Exportar reporte mensual en PDF
**Estado: pendiente**

### Qué se pide
Un resumen mensual prolijo, exportable como PDF, para imprimir o
compartir (ej. por WhatsApp), como alternativa más presentable al export
de JSON crudo que ya existe (pensado para backup técnico, no para leer).

### Comportamiento esperado
- Botón "exportar reporte del mes" en la vista de Reportes, para el mes
  actualmente seleccionado.
- El PDF generado debe incluir, con el mismo estilo visual "libro de
  caja" de la app (papel crema, tinta, tipografía serif para títulos):
  balance del mes, ingresos y gastos totales, desglose por categoría
  (misma información que las barras de categoría en pantalla, pero en
  formato lista o tabla apta para PDF), y las métricas ya calculadas
  (promedio diario, tasa de ahorro, comparación vs. mes anterior).
- Generación 100% client-side (sin backend) — usar una librería JS de
  generación de PDF liviana que corra en el navegador (ej. jsPDF u
  otra equivalente sin dependencias de servidor), cargada como script
  externo igual que se hizo con otras librerías del proyecto si aplica,
  o generar el PDF a partir de HTML/CSS con una librería de conversión
  del lado del cliente.
- El archivo generado debe poder descargarse o compartirse directamente
  desde el navegador (usar la Web Share API si está disponible en el
  dispositivo, con fallback a descarga simple si no lo está).

### Casos de borde a probar
- Mes sin movimientos: el PDF debe generarse igual, mostrando montos en
  cero de forma prolija, no debe fallar ni generar un archivo vacío o
  roto.
- Nombre de archivo generado: debe incluir el mes y año de forma clara
  (ej. `libro-de-caja-junio-2026.pdf`) para que sea fácil de identificar
  si el usuario exporta varios meses con el tiempo.
- Confirmar que el PDF se ve bien tanto en pantallas de celu como al
  imprimirse en papel (proporciones legibles, no depender de scroll).

---
- Widget de pantalla de inicio para carga rápida de un gasto sin abrir la
  app entera — **requiere empaquetar la app con Capacitor** (herramienta
  que envuelve la PWA existente en un `.apk`/`.ipa` nativo sin reescribir
  el código) y publicarla como app nativa en Play Store / App Store, ya
  que los widgets de home screen no son accesibles desde una PWA pura.
  No es urgente, queda como posibilidad de "fase 2" si en algún momento
  se decide dar el paso de empaquetar la app.
---

FEATURE: Mejorar pestaña de Metas — edición y moneda propia

Estado: hecha Depende de: "Módulo de ahorro en dólares" y "Cotización del dólar automática" (ambas ya implementadas — reusar su misma lógica de conversión)

Problema actual

La pestaña de Metas tiene dos limitaciones importantes:

Una vez creada una meta, no se puede editar nada — ni el nombre, ni el monto objetivo, ni el monto ya ahorrado. Si el usuario se equivoca al cargarla o cambia de idea sobre el objetivo, no tiene forma de corregirlo sin borrar y recrear la meta (perdiendo el historial de aportes ya hechos, si lo hubiera).
Las metas asumen siempre pesos. Si el usuario crea una meta en dólares (ej. "juntar USD 2400"), hoy el número se trata como si fueran $2400 pesos, lo cual rompe completamente el sentido de la meta — USD 2400 y $2400 son magnitudes totalmente distintas.
Parte 1 — Edición de metas
Cada meta debe poder editarse: nombre, monto objetivo (target), y monto ya ahorrado (current), con el mismo patrón de modal pre-poblado usado en otras ediciones ya implementadas (movimientos, cuentas, categorías).
Accesible desde un botón/ícono de edición en la tarjeta de cada meta, junto al progreso ya visible.
Si se edita el target de una meta que ya tiene aportes registrados (ver Parte 2), el porcentaje de progreso debe recalcularse automáticamente con el nuevo objetivo, sin perder el historial de aportes ya hechos.
Debe poder eliminarse una meta (si no existe ya esa opción), con confirmación, sin que borre accidentalmente aportes de ahorro en dólares vinculados si el usuario decide conservarlos (ver Parte 3, sobre vínculo con goalId).
Parte 2 — Moneda propia por meta

Extender el modelo de meta (entidad goals) con un campo nuevo:

{
  id, name, target, current,   // campos existentes
  currency: 'ARS' | 'USD',     // nuevo, default 'ARS' para no romper metas existentes
}
Al crear una meta, el usuario elige en qué moneda está definido el objetivo: pesos o dólares. Esto no cambia después de creada la meta (no hay razón para "convertir" una meta ya definida de una moneda a otra — si el usuario se equivocó, mejor editar el target directamente en la moneda correcta que ya tiene seleccionada).
El target y el current de una meta se expresan siempre en la moneda de esa meta (currency). Ejemplo: una meta en USD con target: 2400 significa USD 2400, no $2400.
Parte 3 — Aportes en moneda mixta

Como una meta puede recibir aportes tanto en pesos como en dólares (ej. una meta en USD donde algunos meses se aporta directo en dólares y otros se convierte desde pesos), cada aporte individual debe registrar:

El monto aportado y en qué moneda se aportó ese aporte puntual.
Si la moneda del aporte es distinta a la moneda de la meta, el tipo de cambio usado en ese momento para poder convertir y sumar correctamente al progreso total (reusar la misma lógica de exchangeRates / cotización automática ya implementada en el módulo de ahorro en dólares, no duplicar el mecanismo).
El campo current de la meta representa el total acumulado ya convertido a la moneda de la meta — al sumar un aporte en una moneda distinta, convertirlo primero y sumar el resultado a current.

Esto ya está resuelto en el módulo de ahorro en dólares para el caso de depósitos vinculados a una meta (goalId en dollarSavings) — extender el mismo criterio para que la suma manual de fondos directamente desde la pestaña de Metas (el botón "sumar" que ya existe en cada tarjeta) también soporte elegir la moneda del aporte puntual, no solo depender de los depósitos vinculados desde el módulo de ahorro USD.

Visualización
El progreso de cada meta debe mostrarse en su propia moneda (formato correcto: formatMoney() para ARS, formateador de USD para metas en dólares) — nunca mezclar sin aclarar.
Para metas en USD, mostrar además el equivalente en pesos como referencia, usando el último tipo de cambio disponible (mismo dato que ya se usa en el módulo de ahorro USD), claramente etiquetado como aproximado/referencial y no como el valor "real" de la meta.
Casos de borde a probar
Meta existente de antes de esta feature (sin campo currency): debe tratarse como 'ARS' por default en loadState(), sin romper ni perder datos.
Editar el monto objetivo de una meta en USD: el porcentaje de progreso debe recalcularse en USD, no mezclarse con conversiones a pesos por error.
Sumar un aporte en pesos a una meta en dólares sin tener cargado un tipo de cambio disponible (ni automático ni manual): pedir el tipo de cambio en ese momento antes de poder confirmar el aporte, mismo criterio que ya se usa en el modal de depósito de ahorro USD.
Meta en dólares con aportes hechos en distintos tipos de cambio a lo largo del tiempo: el current acumulado debe ser la suma de cada aporte ya convertido en su momento — no se debe re-convertir retroactivamente todo el historial con el tipo de cambio actual, cada aporte usa el tipo de cambio vigente cuando se cargó.
Eliminar una meta en USD que tiene depósitos de ahorro USD vinculados por goalId: definir qué pasa con esos depósitos (recomendado: quedan como aportes de ahorro USD sueltos, sin vínculo a ninguna meta, no se borran).

Notas de implementación
- `js/goals.js` reescrito. Variables nuevas: `editingGoalId`, `goalModalCurrency`, `addFundGoalId`, `fundCurrency`.
- Migración en `state.js`: `state.goals.map(g => g.currency ? g : { ...g, currency: 'ARS' })`.
- Modal de metas reutilizado para crear y editar: título dinámico, botón "eliminar" visible solo en edición. Selector de moneda (ARS/USD) deshabilitado en modo edición con hint explicativo.
- `deleteGoal()`: desvincula depósitos USD orphans (sets `goalId: null`), no los borra.
- Nuevo modal `#add-fund-modal-backdrop`: elige moneda del aporte, muestra campo TC solo si moneda ≠ moneda de meta. Preview de conversión en tiempo real.
- `formatUSD()` helper local. `formatGoalAmount(amount, currency)` despacha a `formatMoney` o `formatUSD`.
- Metas en USD muestran referencia ARS (`≈ X ARS (ref.)`) usando `getLastExchangeRate()`.
- Bug corregido en `saveDollarDeposit()`: ahora suma `amountUSD` a metas USD y `amountARS` a metas ARS (antes sumaba siempre ARS).
- CSS: `.btn-danger`, `.field-hint`, `.goal-top-right`, `.goal-currency-badge`, `.goal-edit-btn`, `.goal-ars-ref`, `.btn-add-fund` reemplaza `.goal-add-funds`.