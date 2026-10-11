# Prompt para Claude Code — REDISEÑO-B0b (cambio de identidad a "Marino + ámbar")

Contexto: el rediseño pasó de verde + Plus Jakarta Sans a **marino + ámbar + Outfit** (para tener identidad
propia). Reemplacé en `rediseño/` los archivos `REDISENO_SPEC.md`, `BACKLOG_REDISENO.md` y la carpeta
`mockups/` (ahora v2). Ya está hecho B0 (estructura de tokens y tema); esto solo cambia valores.

Trabajá en una rama o directo en `main` como venís haciendo, **un solo commit, sin push**.

1. Leé `rediseño/BACKLOG_REDISENO.md` (ítem REDISEÑO-B0b) y `rediseño/REDISENO_SPEC.md` (secciones 1, 2.2 y 3, y el anexo).
2. Antes de tocar nada, verificá con `git status` que no haya cambios sin commitear que no sean la actualización de `rediseño/`.
   Si `rediseño/` aparece modificado, commitealo aparte: `docs(rediseno): spec v2 marino + ámbar`.
3. Implementá REDISEÑO-B0b tal como está en el backlog: valores de tokens (claro, `data-theme="dark"` y `@media`),
   fuente Outfit, `theme-color` en `manifest.json` y metas, búsqueda con `grep` de restos del verde, `CACHE_NAME` +1.
4. No migres pantallas ni borres tokens viejos.
5. Marcá B0b como `hecho` en el backlog (y B1 pasa a poder empezar). Commit: `style: B0b tokens y fuente marino + ámbar`.
6. Informame: qué restos del verde encontraste y reemplazaste, qué valor de `CACHE_NAME` quedó, y el hash del commit.

No hagas push. Yo pruebo en el celu en claro y en oscuro antes de seguir con B1.
