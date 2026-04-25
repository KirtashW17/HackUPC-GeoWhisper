# Plan: archivado manual de notas propias desde la vista de detalle

## Objetivo

Permitir que el autor de una nota la **archive manualmente** desde
`/notes/:id`. La nota archivada deja de aparecer en el feed cercano y en la
propia vista de detalle (404), pero la fila se conserva en BD (no se borra).

## Estado actual

- La columna `notes.archived` existe (`boolean default false`).
- `Note#view!` ya marca `archived = true` cuando `views_count` alcanza
  `max_views`. **Pero el flag hoy no se usa para nada**: el scope `active` no
  filtra por `archived`, así que archivar no esconde la nota. La razón por la
  que el test "active scope" pasa es que la propia condición
  `views_count < max_views` ya excluye esas filas — el flag es decorativo.
- El fixture `archived_projector` está marcado `archived: true` y también
  tiene `views_count == max_views`; no aporta cobertura del flag por sí solo.

Esto significa que **antes** de añadir UI hay que arreglar la semántica del
scope, o el botón "archivar" no hará nada visible.

## Decisiones de diseño

1. **Soft-delete, no destroy.** Marcamos `archived = true`. No borramos la
   fila por dos razones: (a) auditoría / posible restauración futura,
   (b) el job periódico de purga (mencionado en CLAUDE.md / arquitectura)
   ya hará el barrido físico cuando toque.

2. **El scope `active` debe filtrar por `archived = false`.** Es el cambio
   que da sentido al flag. Mantengo las otras dos condiciones intactas.

3. **Solo el autor puede archivar.** No hay rol de moderación todavía. Si la
   nota no es del usuario actual, devolvemos `404` en vez de `403` para no
   filtrar la existencia de la nota (consistente con cómo `show` ya
   devuelve 404 para notas no activas).

4. **Verbo HTTP: `DELETE /notes/:id`.** Idiomático en Rails; el método
   `destroy` del controller hace soft-delete, no `Note#destroy`. Alternativa
   considerada: `PATCH /notes/:id/archive`. Descartada porque añade una ruta
   custom para algo que conceptualmente es "quita esto de mi vista" y los
   ejemplos de Rails con soft-delete usan DELETE consistentemente.

5. **Redirección post-archivado a `/map`** con flash de confirmación.
   Coincide con el flujo del create.

6. **Sin confirmación JS modal por ahora.** Turbo ya pide confirmación si se
   añade `data: { turbo_confirm: "..." }` al botón. Lo incluiremos.

7. **No tocamos `view!`.** Sigue marcando archived al alcanzar el cap. Eso
   convive bien con el archivado manual: ambos caminos llevan al mismo
   estado final.

## Cambios

### Modelo (`app/models/note.rb`)

- Cambiar el scope:
  ```ruby
  scope :active, -> {
    where(archived: false)
      .where("expires_at IS NULL OR expires_at > ?", DateTime.current)
      .where("max_views IS NULL OR views_count < max_views")
  }
  ```
- Añadir un método `archive!` con su YARD:
  ```ruby
  # Mark this note as archived so it stops appearing in the active feed
  # and on its own detail page. Idempotent.
  #
  # @return [Boolean] true on save (matches AR convention).
  def archive!
    update!(archived: true)
  end
  ```
  *Why método dedicado:* deja un sitio único donde extender la lógica
  (telemetría, broadcast a otros clientes vía Turbo Streams, etc.) sin
  tocar el controller. *How:* invocado desde `NotesController#destroy`.

### Rutas (`config/routes.rb`)

- Añadir `:destroy` a `resources :notes`:
  ```ruby
  resources :notes, only: %i[new create show destroy]
  ```

### Controller (`app/controllers/notes_controller.rb`)

- Acción `destroy`:
  - Buscar la nota por id sin scope `active` (queremos poder archivar una
    nota a la que llegamos desde un enlace propio, aunque ya esté capada).
  - Si no existe **o no pertenece a `Current.user`**, `head :not_found`.
  - Llamar a `@note.archive!`.
  - Redirigir a `map_path` con flash `t("detail.archive.success")`.
- YARD docstring igual que el resto.

### Vista (`app/views/notes/show.html.erb`)

- En la *action row* actual (`whisper_back` + `report`), **sustituir el
  botón "report" por un botón "archive" cuando la nota es propia**
  (`@note.user_id == Current.user&.id`). Reportarse a uno mismo no tiene
  sentido, así que el slot secundario se reutiliza.
- Mantener exactamente el mismo tamaño/posicionamiento que el botón
  "report" para que el layout no salte: clase secundaria, ancho automático,
  a la derecha del primario `whisper_back`. La diferencia visual: el botón
  archive **no** está disabled (es la única acción habilitada hoy en esa
  fila), y usa `button_to` con `method: :delete` y `turbo_confirm`.
- Markup propuesto (sin estilos inline; reutiliza las clases del botón
  report con `cursor-pointer` en lugar de `cursor-not-allowed` y sin la
  opacidad atenuada):
  ```erb
  <% if @note.user_id == Current.user&.id %>
    <%= button_to t("detail.archive.cta"),
          note_path(@note),
          method: :delete,
          data: { turbo_confirm: t("detail.archive.confirm") },
          class: "rounded-button border border-card-edge bg-card px-4 py-3 font-sans text-sm font-medium text-ink-soft" %>
  <% else %>
    <%# botón report actual, intacto %>
  <% end %>
  ```
  El botón `whisper_back` (primario) se queda como está, deshabilitado
  hasta fase 5.

### i18n (`config/locales/{en,es,ca}.yml`)

Claves nuevas bajo `detail.archive`:
- `cta`: "Archive this whisper" / "Archivar este susurro" / "Arxiva aquest xiuxiueig"
- `confirm`: "This whisper will disappear forever. Continue?" / "Este susurro desaparecerá para siempre. ¿Continuar?" / "Aquest xiuxiueig desapareixerà per sempre. Continuar?"
- `success`: "Whisper archived." / "Susurro archivado." / "Xiuxiueig arxivat."

### Tests (TDD, sin Capybara)

**Modelo (`test/models/note_test.rb`)**:

1. `active scope excludes archived notes` — crea dos notas con TTL
   abierto y views holgados, archiva una con `update!(archived: true)`,
   asegura que solo la otra está en `Note.active`.
2. `archive! marks the note as archived and persists` — comprueba el
   side-effect e idempotencia (llamar dos veces no rompe).
3. **Actualizar** el test "active scope returns only active notes" para
   incluir el caso archivado.

**Controller (`test/controllers/notes_controller_test.rb`)**:

1. `destroy archives the user's own note and redirects to /map with flash`.
2. `destroy returns 404 for a note owned by someone else` — usar
   `notes(:campus_nord_vending)` (de carla) con sesión de alice.
3. `destroy returns 404 for a non-existent id`.
4. `destroy requires authentication` — sin login redirige al login (o lo
   que haga el resto del controller en ese caso; ver `before_action`s).
5. **Añadir aserción** al test del feed `nearby` o show: una nota con
   `archived: true` no aparece en `nearby`. Probablemente solo hace falta
   añadir un fixture archivado en zona alcanzable (o reusar
   `archived_projector` y comprobar que sigue fuera del feed por la nueva
   razón). Verificar el fixture: si `archived_projector` ya tiene
   `views_count == max_views`, su exclusión sigue siendo ambigua. **Voy a
   modificar ese fixture** para que `views_count = 0, max_views = nil`
   manteniendo `archived: true`; así el único motivo para excluirlo es el
   flag.

**Integración**: no veo necesidad de un test de integración aparte; los
tests de controller cubren la transición ruta → modelo → render.

### RuboCop / Brakeman / Suite completa

Estándar antes de cerrar.

## Riesgos

- **Cambio del scope `active` afecta a `nearby` y `show`.** Cualquier nota
  con `archived: true` ya en BD desaparecerá. Compruebo que ningún
  fixture/test existente depende de "archived true Y aparece en active".
  Por la búsqueda anterior no hay ninguno; el único fixture afectado es
  `archived_projector`, que ya está fuera del feed.
- **Carrera con `view!`:** si el cap se alcanza al mismo tiempo que el
  autor archiva, ambos hacen UPDATE; el flag termina en `true` igualmente.
  Aceptable.
- **CSRF en `button_to` con `method: :delete`:** Rails lo gestiona; no hay
  riesgo extra. La acción está en un namespace ya autenticado.

## Preguntas abiertas

- ¿Queremos exponer también una **lista** de "mis notas archivadas" para
  poder restaurarlas? **Propuesta:** no, fuera de alcance — entra en
  `doc/future.md` si surge.
- ¿Telemetría / contador de archivados? **Propuesta:** no, MVP.
