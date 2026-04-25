# Plan: cleanup periódico de notas expiradas (`archived = true`)

## Objetivo

Tener un job recurrente que **archive** (no borre) las notas que ya no son
"vivas": expiraron por tiempo o agotaron sus lecturas. Coincide con la línea
152 de `doc/task_planning.md` y con la estrategia de soft-delete acordada en
`doc/plans/manual_archive.md`.

## Estado de partida

- `notes.archived` ya es columna (boolean, default false).
- `Note#view!` ya marca `archived = true` cuando `views_count >= max_views`.
  Cubre el camino síncrono (mientras alguien está leyendo); el camino del
  tiempo (`expires_at`) hoy **no archiva nada**: simplemente la nota deja de
  aparecer en el scope `active`. La fila acumula sin marcarse.
- El scope `active` filtra por `expires_at` y por `views_count < max_views`.
  No filtra por `archived`. Eso significa que una nota con `archived: true`
  pero todavía dentro de su ventana de tiempo y de cap **seguiría apareciendo
  como activa**. Hoy en la práctica no pasa porque `view!` solo archiva al
  alcanzar el cap (caso ya excluido), pero el job va a archivar por
  `expires_at` también, y la nota expirada ya está fuera del scope por la
  fecha. Conclusión: el job es housekeeping puro hoy; el flag se vuelve
  observable sólo cuando entre el archivado manual (otro plan).

## Decisiones

1. **Job de Active Job**, no rake task. `ApplicationJob` ya existe; usar el
   adapter por defecto. SolidQueue se introducirá más adelante.
2. **Nombre**: `Notes::ArchiveExpiredJob`. Namespacing por modelo, deja
   espacio a futuros jobs (`Notes::PurgeArchivedJob` para borrado físico).
3. **Una sola query con `update_all`**. No instanciamos AR objects: el job
   correrá sobre N filas y no necesita callbacks/validaciones.
   Condición:

   ```sql
   archived = false
   AND (
     (expires_at IS NOT NULL AND expires_at <= :now)
     OR (max_views IS NOT NULL AND views_count >= max_views)
   )
   ```

   Incluyo el caso `views_count >= max_views` por defensa: aunque `view!` ya
   lo marca, una carrera o un fixture/seed puede dejar filas en ese estado.
4. **Toca `updated_at`** explícitamente (no se hace solo con `update_all`)
   para que la fila refleje el cambio.
5. **Devuelve el número de filas archivadas** (lo que devuelve `update_all`).
   Útil para tests y, más adelante, para logging/metrics.
6. **Idempotente**: ejecutarlo dos veces seguidas archiva 0 filas la
   segunda. Lo cubrimos con un test.
7. **Programación periódica**: fuera de scope de este cambio. Cuando entre
   SolidQueue se añadirá un `recurring.yml`. Mientras tanto el job se puede
   disparar a mano con `Notes::ArchiveExpiredJob.perform_now` o via cron de
   sistema invocando `bin/rails runner`. Lo dejamos documentado en
   `doc/next-steps.md`.

## Cambios

- `app/jobs/notes/archive_expired_job.rb` — el job.
- `test/jobs/notes/archive_expired_job_test.rb` — tests:
  - archiva notas expiradas por tiempo,
  - archiva notas con `views_count >= max_views` no archivadas todavía,
  - no toca notas activas (sin `expires_at`, dentro de cap, etc.),
  - no re-archiva notas ya archivadas (idempotencia),
  - devuelve el conteo correcto.
- `doc/task_planning.md` — marcar la tarea de la línea 152.
- `doc/next-steps.md` — apuntar la pendiente de programación recurrente.

## Fuera de scope

- Borrado físico (`destroy`) de notas archivadas — futuro
  `Notes::PurgeArchivedJob`.
- Filtrar `archived` en `scope :active` — pertenece al plan
  `manual_archive.md`.
- Añadir `Note#archive!` — íd.
