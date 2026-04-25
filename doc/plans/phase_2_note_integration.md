# Plan — Integración Fase 2 ↔ Modelo `Note` real *(completado)*

> Ya tenemos en `main` el modelo `Note` que escribió el colega. Toca **borrar
> el stub `Notes::Catalog`** y conectar `NotesController` con el AR real.
> Además **aprovechamos** para añadir una nota demo en Campus Nord (la
> ubicación de la demo) y revisar todas las incoherencias entre el contrato
> que asumimos en Fase 2 y lo que el modelo real expone.
>
> **Branch:** la actual (`phase-2/map-and-compose-ui`), ya con el merge del
> colega aplicado. Este plan finaliza Fase 2.
>
> **Estado:** completado al 100%. **118/118 tests verde**, RuboCop limpio,
> Brakeman sin alertas accionables nuevas. Smoke test manual a cargo del
> usuario.
>
> **Decisiones técnicas y motivaciones** viven en
> [`../decisions.md`](../decisions.md) (no se añaden nuevas).

---

## Estado actual (auditoría)

### Lo que el merge ha traído

- [X] Migración `CreateNotes` (`content`, `latitude/longitude` decimales, `expires_at` y `max_views` nullable, `views_count default: 0`, `user_id`, `visibility:integer default: 0`, `language:string`, índice compuesto sobre `(latitude, longitude)`).
- [X] Migración `AddArchivedToNotes` (`archived:boolean default: false, null: false`).
- [X] Modelo `Note` con validaciones y scope `active`.
- [X] Enum `visibility = { public_note: 0, private_note: 1, friends_only: 2 }`.
- [X] Método `view!`: incrementa `views_count`, marca `archived = true` si llega al cap, **skipea para `private_note?`**.
- [X] 14 tests del modelo (`test/models/note_test.rb`).
- [X] Fixture vacío en `test/fixtures/notes.yml` (sin notas precargadas).
- [X] Convención nueva en `CLAUDE.md`: **preferir fixtures** sobre `Model.create!` inline en setups.
- [X] Helper `sign_in_as(user, password:)` en `test_helper.rb` y `FIXTURE_PASSWORD` constante.
- [X] Fixtures de `users.yml` con `alice` (en, onboarded), `bob` (en, no onboarded), `carla` (ca, onboarded).
- [X] Seeds parciales (3 notas, sin Campus Nord; `Note.destroy_all` no idempotente).

**104 tests verde** (90 nuestros + 14 del colega), nada está roto pero hay duplicación entre el stub y el modelo real.

### Incoherencias entre el stub y la realidad

| Concepto | Stub Phase 2 | Modelo `Note` real | Decisión |
|---|---|---|---|
| `nearby(lat:, lng:, radius_m:)` | método de clase en `Notes::Catalog` | **no existe** | Añadir a `Note` (bounding box + Haversine en Ruby; PostGIS queda en `future.md`). |
| Lookup por id | `find` devuelve `nil` en miss | `Note.find` levanta `ActiveRecord::RecordNotFound` | Controller usa `Note.active.find_by(id:)` y comprueba `nil`. |
| `view!` | no-op | incrementa, archiva si tope, salta si `private_note?` | Es lo correcto — el controller ya lo invoca. |
| `time_left_seconds` | en `Stub` | no existe | Añadir a `Note`. |
| `views_remaining` | en `Stub` | no existe | Añadir a `Note`. |
| `as_json_payload` | en `Stub` | no existe | Añadir a `Note`. |
| `distance_to_m(lat, lng)` | en `Stub` | no existe | Añadir a `Note` (Haversine). |
| `distance_m` (per-result) | atributo de struct | no existe | `attr_accessor :distance_m` en `Note` (poblado por `nearby`). |
| Enum `visibility` | `%w[public friends whisper]` (form) | `public_note/private_note/friends_only` | **Romper.** Alinear `ComposeForm` con los keys del enum. |
| `expires_at` validation | `> created_at` si presente | `>= created_at OR DateTime.current` (raro pero funciona vía coerción a Float) | El real es válido, no tocamos. |
| `max_views` | `≥ 1` si presente | `> 0`, integer only | Equivalente. |
| `archived` en `active` scope | n/a | el scope sí filtra implícito (`views_count < max_views` excluye archivadas por views; pero **no** filtra archivadas por flag manual) | Aceptable para MVP; revisar en Fase 5 cuando entre el job de purga. |

---

## Decisiones técnicas

### 1. Añadir presentación en `Note` (no presenter)

**Decisión:** Añadir `time_left_seconds`, `views_remaining`, `as_json_payload`, `distance_to_m`, `attr_accessor :distance_m` directamente al modelo.

**Trade-off:** Mete concerns de presentación en el modelo. Lo correcto a futuro sería un presenter (`Notes::NearbyResult`) o un serializer (Jbuilder, alba). Para hackathon, **mantener la firma estable** con los nombres que el controller y la JSON contract ya usan vale más que la pureza arquitectónica. Documentado como deuda en `future.md`.

ANNOTATION: Por ahora los implementamos en el modelo, pero se puede anotar en future que idealmente deberíamos de usar un presenter para la separación de responsabilidades

### 2. `Note.nearby` con bounding box + Haversine en Ruby

**Decisión:** No usar SQL Haversine — SQLite no tiene `acos`/`sin`/`cos` nativos. Bounding box con `WHERE latitude BETWEEN x AND y` (índice `(latitude, longitude)` ya creado) y luego Haversine en Ruby sobre el subset.

**Por qué basta:** con el cap de 5 km y datos a escala demo (decenas de notas), el bounding box reduce a un puñado de filas y el Ruby loop es despreciable. La migración a PostGIS + `ST_DWithin` indexado ya está apuntada en `future.md`.

ANNOTATION: CORRECTO, EN FUTURE.MD YA DOCUMENTAMOS ESTE CAMBIO DE CARAAL FUTURO

### 3. Alinear `ComposeForm` con los keys del enum

**Decisión:** `SUPPORTED_VISIBILITIES = %w[public_note private_note friends_only]`. Default `"public_note"`. Esto **rompe** el form actual (que envía `"public"` y reventaría `Note.create!`).

Mapping conceptual prototipo → enum:
- "public" (anyone here) → `public_note`
- "friends only" (friends_only) → `friends_only`
- "whisper" (single recipient) → `private_note`

La nomenclatura de la UI sigue siendo `public / friends / whisper` en i18n; solo el value posteado al backend cambia.

annotation: ok alinia el compose form

### 4. `#create` con manejo real de errores

**Decisión:** `NotesController#create` usa `Note.create!(@form.to_note_params)` y rescata `ActiveRecord::RecordInvalid`. Si los AR errors son distintos a los del form (poco probable porque el form valida antes), las del modelo se transfieren al `@form` para mostrarlas.

### 5. Seeds idempotentes con `Campus Nord`

**Decisión:** Añadir nota explícita en Campus Nord (41.3892, 2.1133). Mantener las dos existentes (Plaça Reial, Parc Güell). Hacer seeds idempotentes con `find_or_create_by` sobre `(content, latitude, longitude)` para que correr `db:seed` dos veces no duplique. Eliminar el `Note.destroy_all` actual (destructivo).

ANNOTATION: Y como identificamos los registros de forma unica? De todos modos si, hagamos los seeds idempotentes.

### 6. Fixtures Note + refactor de tests del controller

**Decisión:** Crear fixtures reales en `notes.yml` (no vacío) con los casos que `NotesControllerTest` necesita: una nota cercana a alice, una expirada, una archivada (over-views), una unlimited-views. Refactor `NotesControllerTest` para usar `users(:alice)` + `notes(:fixture_name)` + `sign_in_as` helper, alineado con la convención nueva de CLAUDE.md.

ANNOTATION: OK

---

## Pasos de implementación

### A. Extender `Note` con la superficie esperada

1. Añadir al modelo:
   - `attr_accessor :distance_m`
   - `time_left_seconds` — segundos hasta `expires_at`, floor 0, `nil` si permanente.
   - `views_remaining` — `max_views - views_count`, floor 0, `nil` si sin cap.
   - `distance_to_m(lat, lng)` — Haversine al punto dado.
   - `as_json_payload` — hash con `id, content, latitude, longitude, distance_m, language, time_left_seconds, views_remaining`.
2. Tests para cada uno (extender `note_test.rb`):
   - `time_left_seconds` con `expires_at: nil`, futuro, pasado.
   - `views_remaining` con `max_views: nil`, normal, agotado.
   - `as_json_payload` keys exactos.
   - `distance_to_m` aproximado al cálculo de Haversine entre dos puntos conocidos.
3. YARD docs en cada método público.

### B. `Note.nearby`

4. Implementar `Note.nearby(lat:, lng:, radius_m: 1_000)` como class method:
   - `MAX_RADIUS_M = 5_000` (constante en el modelo).
   - Clamp del radio.
   - Bounding box via `degrees ≈ radius_m / 111_000`.
   - Subselect `active`, filter por bbox, popular `distance_m` en cada result, filtrar por radius real, sort por distance.
5. Tests del scope `nearby`:
   - Devuelve sólo notas dentro del radio.
   - Excluye expiradas y over-cap (vía `active`).
   - Ordena ascendente por distancia.
   - Cap del radio en 5 km.
   - Caso permanente (`expires_at: nil`) y unlimited views (`max_views: nil`) sí aparecen.

### C. Fixtures `notes.yml`

6. Crear fixtures cubriendo:
   - `epsevg_saffron` — alice, en, EPSEVG, futuro.
   - `placa_reial_lampposts` — alice, en, Plaça Reial, futuro.
   - `campus_nord_vending` — carla, en, Campus Nord, unlimited views.
   - `expired_brunch` — alice, ca, EPSEVG, `expires_at: 1.hour.ago` (para tests de exclusión).
   - `archived_projector` — alice, es, EPSEVG, `archived: true, max_views: 3, views_count: 3` (over-cap).
   - `permanent_term` — carla, en, EPSEVG, `expires_at: nil`.

### D. Refactorizar `NotesControllerTest`

7. Setup pasa a `@user = users(:alice); sign_in_as(@user)` (ya hecho parcialmente; verificar).
8. Reemplazar `note_path(1)` por `note_path(notes(:campus_nord_vending))`.
9. Tests de ids fijos (5, 6, 9 del stub) los reescribimos con fixtures (`notes(:expired_brunch).id`, `notes(:archived_projector).id`).
10. Aceptar que el JSON payload tiene `note["id"]` numérico cualquiera (id de fixture).

### E. Alinear `ComposeForm`

11. `SUPPORTED_VISIBILITIES = %w[public_note private_note friends_only]`.
12. Default `attribute :visibility, :string, default: "public_note"`.
13. Tests del form que asumen `"public"` como default — actualizar.

### F. Actualizar la vista de compose

14. `f.radio_button :visibility, "public_note", ...` para el chip habilitado.
15. Chips disabled para `friends_only` y `private_note` (las claves i18n `compose.fields.visibility.{friends,whisper}` se mantienen como labels; solo cambia el value).

### G. Conectar `NotesController` al modelo real

16. `#nearby`: `Note.active.nearby(lat:, lng:, radius_m: radius).map(&:as_json_payload)`.
17. `#show`: `Note.active.find_by(id: params[:id]) || head(:not_found)`. Llamar `@note.view!`.
18. `#create`:
    ```ruby
    if @form.valid?
      Note.create!(@form.to_note_params.merge(user: current_user))
      redirect_to map_path, notice: t("compose.success_real")
    else
      render :new, status: :unprocessable_entity
    end
    ```
19. Quitar todos los `TODO[phase-1-merge]` y los comentarios que mencionan al stub.
20. Añadir clave i18n nueva `compose.success_real` (el `success_stub` se queda como key obsoleta y la quitamos al final).

### H. Borrar el stub

21. `rm app/models/notes/stub.rb app/models/notes/catalog.rb`.
22. `rm test/models/notes/catalog_test.rb`.
23. `rmdir app/models/notes test/models/notes` si quedan vacíos.
24. Grep agresivo por `Notes::Catalog`, `Notes::Stub`, `# TODO[phase-1-merge]` y borrar referencias en docs.

### I. Seeds con Campus Nord + idempotencia

25. Reemplazar `Note.destroy_all` + `NOTES.each create!` por:
    ```ruby
    NOTES.each do |attrs|
      Note.find_or_create_by!(content: attrs[:content],
                              latitude: attrs[:latitude],
                              longitude: attrs[:longitude]) do |n|
        n.user        = User.find_by!(email: attrs[:author_email])
        n.expires_at  = attrs[:expires_at]
        n.max_views   = attrs[:max_views]
        n.language    = attrs[:language]
        n.visibility  = attrs.fetch(:visibility, :public_note)
      end
    end
    ```
26. Notas a sembrar:
    - **Campus Nord** (41.3892, 2.1133) — autor anna (ca), unlimited views, expira en 7 días. *Para la demo presencial.*
    - **EPSEVG** (41.2236, 1.7280) — autor alice (en).
    - **Plaça Reial** (41.3801, 2.1749) — autor ana (es).
    - **Parc Güell** (41.4145, 2.1527) — autor anna (ca).
    - Una nota expirada en cualquier sitio (para validar el filtro a ojo si abrimos la consola).
27. Asignar `language` explícito a cada una (no `nil`).

### J. Documentación

28. Actualizar `doc/plans/phase_2_map_and_compose.md`: marcar la sección "Integración con Phase 1" como completada.
29. Actualizar `doc/next-steps.md`: la entrada "Integrar `NotesController#create` con el modelo `Note`" pasa a `[X]`. La entrada "Borrar `Notes::Catalog` stub" pasa a `[X]`.
30. Actualizar `doc/task_planning.md`: marcar Fases 2/3/4 que ya cubrimos como `[X]`.
31. Apuntar **deuda técnica** en `future.md`: extraer `time_left_seconds`/`views_remaining`/`as_json_payload` a un presenter dedicado (`Notes::NearbyResult` o serializer).

### K. Quality gates *(completado)*

- [X] `bin/rails test` — 118/118 verde (15 nuevos en `NoteTest`, 6 fixtures, todos los caminos del controller)
- [X] `bin/rubocop` — sin offenses
- [X] `bin/brakeman` — solo el Weak HTTP Verb Confusion preexistente; ninguna alerta nueva accionable
- [ ] Smoke test manual del usuario en navegador

---

## Pulido extra (en sustitución del usuario / linter sobre las vistas)

Tras la integración, las vistas de compose y detail recibieron un pase de
diseño adicional que conviene dejar registrado para futuros lectores:

- **`notes/new.html.erb`** — back button rediseñado como icon-card cuadrado en la esquina (matchea la pattern del detail), location chip movido al top bar como pill con shadow, **visibility migrada de chips de pill a 3 botones cuadrados con icono** (público / friends SOON / one-person SOON, todos `aria-disabled` los dos últimos), max_views como **range slider temático** (`gw-range` CSS) con `range-readout` Stimulus controller que pluraliza desde i18n.
- **`notes/show.html.erb`** — eyebrow `{distance}M AWAY · LEFT {Xh} AGO` en accent (icono de círculos concéntricos), card hero con highlighter rotado, lifecycle bars con iconos inline, action row con **Whisper back** + **Report**, ambos disabled con SOON (Fase 5/7).
- **`map_controller.js`** — pin de notas también pulsa (`gw-pin__pulse`); `noteHref(note)` forwardea `lat`/`lng` del usuario al detail para que el server pueda escribir el "12m AWAY" del eyebrow.
- **`NotesController#show`** — opcionalmente acepta `lat`/`lng` (mismo `numeric_param` que `#nearby`) y popula `@note.distance_m`.
- **CSS Leaflet** — tintado más sutil (`sepia 0.18 hue-rotate -6 brightness 1.18 contrast 0.88`) que el inicial; tile container fondo `#faf5ea` (paper-light) en vez de `bg-deep`. Pins más grandes (32×32 con dot 14–16px).
- **`config/tailwind.config.js`** — `shadow-card` reescrito a un **doble drop tinted warm** (`0 1px 2px rgba(60,40,20,.06), 0 16px 32px -12px rgba(60,40,20,.28)`) para que las cards no se desvanezcan contra `bg-card`.
- **i18n nuevas:** `compose.back`, `compose.location.placeholder`, `compose.fields.max_views.readout.{one,other}`, `detail.eyebrow.{distance,left_ago}`, `detail.report` — todas con paridad en/es/ca.

Tests añadidos por el usuario que verifican estos puntos:
- `new does not render the bottom tab bar`
- `new exposes a back link to the map` (con `aria-label`)
- `new shows a location chip` (`[data-compose-location]`)
- `new renders max_views as a range slider wired to range_readout`
- `new renders visibility as icon buttons with friends and one-person disabled`
- `show calls view! on the note`
- `show returns 404 for an inactive (expired) note`

---

## Lo que NO se toca en esta tanda

- Fase 5 (job de purga + ink-bleed vanish del detail).
- Fase 6 (pulido UI/UX, PWA install).
- Sustitución del approach de top-of-form alert vs inline (sigue pendiente — `next-steps.md`).
- Refactor del modelo `Note` para sacar la presentación a un presenter (deuda).
- Migración a PostGIS (sigue en `future.md`).

---

## Riesgos

- **`expires_at`-validación con `numericality`** del colega: usa `>= note.created_at || DateTime.current`. Funciona porque DateTime se coerce a Float vía `.to_f`. Si en algún momento parseamos la columna como Date sin tiempo o cambia el tipo, la validación rompe en silencio. Apuntar como cabo suelto si surge.
- **Visibility mismatch** ya conocido: si por algún motivo se posta `"public"` desde un cliente legacy, `Note.create!` levantará `ArgumentError` por enum inválido. Mitigado por la inclusión-validation del form.
- **`view!` skipea para `private_note`**: significa que las notas privadas no decrementan views ni se archivan automáticamente. Esto es intencional según el colega; en MVP no las exponemos en UI (chip disabled), así que no hay impacto.
- **Fixtures de `expires_at` con `Time.current.iso8601` ERB**: las fixtures se cargan una sola vez. Si los tests dependen de "este note expirará en 2h", el cálculo se evalúa al cargar y el momento `Time.current` puede haberse movido. Mitigado usando ventanas amplias (1 hora atrás → garantizadamente expirada; 24 horas adelante → garantizadamente activa).

---

## Preguntas abiertas

1. **¿Quitar el chip `private_note`/`friends_only` del compose form** o dejarlos como SOON visibles? El comportamiento actual de `view!` (no incrementa para private) es coherente con que sean post-MVP. Propuesta: mantenerlos visibles pero `disabled` con badge SOON. *(Mi recomendación.)*
2. **¿`compose.success_real` reemplaza a `compose.success_stub` o convive?** Como el stub ya no existe tras la integración, `success_stub` queda huérfana. Propuesta: borrar `success_stub` de las tres locales y renombrar a `compose.success`. *(Mi recomendación.)*
3. **`note.distance_m` como `attr_accessor`** mete estado mutable en un AR record. Acepto la deuda técnica con un comentario en el modelo apuntando al presenter futuro. ¿OK o prefieres meter el presenter ya? *(Para hackathon recomiendo aceptar la deuda.)*
