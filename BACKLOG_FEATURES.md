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

---

## FEATURE: Edición completa de movimientos existentes
**Estado: pendiente**

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

---

## FEATURE: Edición de cuentas y saldo inicial
**Estado: pendiente**

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

---

## FEATURE: Módulo de ahorro en dólares
**Estado: pendiente**

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

---

## FEATURE: Cotización del dólar automática
**Estado: pendiente** desde una API
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

---

## FEATURE: Proyección de fin de mes y gastos hormiga
**Estado: pendiente**

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

---

## FEATURE: Transferencias entre cuentas
**Estado: pendiente**
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
