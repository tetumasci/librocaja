# Reglas de trabajo — Libro de Caja

**Leer este archivo completo ANTES de implementar cualquier feature o cambio.** Después leer la feature en `PENDIENTES.md` (también completa) y recién ahí tocar código.

Contexto: PWA de finanzas personales en HTML/CSS/JS vanilla, sin frameworks ni build step. Persistencia local en `localStorage`. Archivos: `index.html`, `styles.css`, `manifest.json`, `sw.js`, `_headers` y el código en `js/`.

## Mapa de documentación

| Archivo | Para qué |
|---|---|
| `docs/REGLAS.md` | Este archivo: cómo trabajar |
| `docs/PENDIENTES.md` | Features por hacer, con su spec completa |
| `docs/CHANGELOG.md` | Historial de lo hecho (una línea por cambio) |
| `docs/rediseno/REDISENO_SPEC.md` | Identidad visual (estilo "E"), tokens y componentes |
| `docs/rediseno/mockups/` | Mockups HTML exactos de cada pantalla (claro y oscuro) |

No hay documento de "features hechas" con specs viejas: si hace falta el detalle de algo ya hecho, está en el código y en el historial de git.

## Flujo de trabajo para una feature

1. Leer este archivo y la feature completa en `PENDIENTES.md`. Tomar la primera `pendiente` de arriba hacia abajo (el orden importa por las dependencias). Si depende de otra todavía pendiente, avisar al usuario en vez de implementarla fuera de orden.
2. Leer `index.html`, `styles.css` y los archivos de `js/` que toque la feature, para ver el estado real del código (no asumir que quedó como describen las notas viejas).
3. Decir en una línea a qué archivo de `js/` pertenece el código nuevo (o si hace falta uno nuevo) antes de empezar a programar.
4. Marcar la feature como `en progreso` en `PENDIENTES.md`.
5. Implementarla siguiendo las reglas de abajo y probar los casos de borde listados.
6. Al terminar: **borrar la feature de `PENDIENTES.md`** y agregar una entrada en `CHANGELOG.md` (ver formato ahí) con archivos tocados y cualquier decisión o caso de borde que no estaba en la spec.
7. Parar ahí. No seguir con la siguiente feature en la misma sesión salvo que el usuario lo pida: cada feature se prueba en el dispositivo real antes de seguir.

## Reglas generales

- **Identidad visual**: la define `docs/rediseno/REDISENO_SPEC.md` (estilo "E": verde, Plus Jakarta Sans, tokens semánticos, tema claro y oscuro). Todo lo nuevo usa esos tokens (`--bg`, `--surface`, `--text`, `--muted`, `--income`, `--expense`, `--link`, etc., definidos en `:root` y en los dos bloques oscuros de `styles.css`) y nunca colores fijos. El diseño anterior (papel crema, Source Serif 4, Inter, JetBrains Mono) ya no existe. Toda pantalla nueva debe verse bien en claro y en oscuro, con contraste AA y áreas táctiles de al menos 44 px.
- **Sin frameworks ni build step**: HTML/CSS/JS vanilla servido como archivos estáticos, salvo que una feature diga lo contrario explícitamente.
- **Modularización**: el código vive en `js/` (`state.js`, `ui.js`, `ledger.js`, `recurring.js`, `installments.js`, `accounts.js`, `budgets.js`, `goals.js`, `stats.js`, `settings.js`, `plan.js`, `suggestions.js`, `quickadd.js`, `transfers.js`, `main.js`), cargados como `<script>` en orden de dependencia desde `index.html`. Nunca volver a crear un `app.js` monolítico. Código nuevo: elegir el archivo por dominio, o crear uno nuevo con nombre de dominio.
- **Persistencia**: todo campo nuevo en `state` debe tener un default sensato en `loadState()` para no romper instalaciones existentes, y resetearse en `clearAllData()` e incluirse en `handleImportFile()`.
- **Un solo overlay/modal visible a la vez**: usar siempre el mecanismo centralizado de apertura/cierre existente, nunca abrir un modal hardcodeado por fuera.
- **Los modales nunca se auto-abren**: ninguno puede abrirse como consecuencia de la carga de la página o de un render automático, solo como respuesta directa a un click/tap. Fue un bug real ya corregido una vez.
- **Moneda explícita siempre**: `formatMoney()` para pesos, un formateador separado y etiquetado "USD" para dólares. Nunca un "$" sin aclarar la moneda.
- **Sin backend**: todo vive en `localStorage`, salvo llamadas de solo lectura a APIs públicas para datos externos (cotización del dólar, inflación) cuando la feature lo pida. Nunca enviar datos del usuario a ningún servidor.
- **Bump de versión del SW en cada push**: cada vez que se modifique cualquier archivo JS/CSS/HTML y se haga push, incrementar el número en `CACHE_NAME` de `sw.js` (ej. `v36` → `v37`). Sin esto el browser no detecta la versión nueva y el banner de actualización nunca aparece en iOS. Si se agrega un archivo JS nuevo, incluirlo también en el precache de `sw.js`.
- **Movimientos pendientes**: los entries con `pending: true` aparecen en el listado pero no pesan en ningún total (balance, reportes, saldo real). Cualquier cálculo agregado nuevo debe excluirlos (`.filter(e => !e.pending)`).
