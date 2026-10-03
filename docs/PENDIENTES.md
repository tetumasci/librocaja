# Pendientes — Libro de Caja

Solo features **por hacer**. Lo ya hecho está en `CHANGELOG.md`.
Antes de implementar cualquiera: leer `REGLAS.md` y después la feature completa.

**Orden**: de arriba hacia abajo (respetar dependencias). Si una feature depende de otra pendiente, avisar al usuario en vez de implementarla fuera de orden.

**Nota de estilo**: las specs de abajo se escribieron antes del rediseño. Donde dicen "terracota" leer `--expense`, donde dicen "oliva" leer `--income`, y "papel crema / serif" ya no existe (ver `rediseno/REDISENO_SPEC.md`).

**Estado de cada feature**: `pendiente` o `en progreso`. Al terminarla se **borra de este archivo** y se agrega al `CHANGELOG.md`.

---


## Recordatorio de conciliación periódica
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

## Historial de ajustes por cuenta
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

## Alerta de aporte del Plan sin registrar
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

## Rendimiento real vs. proyectado en el Plan
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



## Ideas sin desarrollar todavía

(Para convertir en feature completa más adelante.)

- Backup automático a Google Drive del usuario (sin backend propio)
- Comparativa año contra año (ej. junio 2026 vs junio 2025)
- Score de salud financiera combinando tasa de ahorro + presupuestos +
  racha
- Fecha estimada para alcanzar cada meta de ahorro según ritmo actual de
  depósitos
- Simulador de escenarios en el módulo Plan ("¿y si aporto más por mes?")
- Foto de comprobante adjunta a un movimiento (base64 local)
- PIN o bloqueo biométrico al abrir la app
- Widget de pantalla de inicio para carga rápida de un gasto sin abrir la
  app entera — **requiere empaquetar la app con Capacitor** (herramienta
  que envuelve la PWA existente en un `.apk`/`.ipa` nativo sin reescribir
  el código) y publicarla como app nativa en Play Store / App Store, ya
  que los widgets de home screen no son accesibles desde una PWA pura.
  No es urgente, queda como posibilidad de "fase 2" si en algún momento
  se decide dar el paso de empaquetar la app.
