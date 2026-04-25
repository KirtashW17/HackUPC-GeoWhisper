# Fase 7 — Pestaña "Yourself" + archivado de notas propias

> **Estado: implementada.** Divergencias respecto al plan, fijadas en
> revisión:
> - Archivado expone **`DELETE /notes/:id`** (`NotesController#destroy`),
>   no `POST /notes/:id/archive` con miembro custom. La semántica es la
>   misma — archivar es el único soft-delete que existe — y `destroy`
>   encaja con la convención REST. Las referencias a `archive_note_path`
>   y `#archive` en este documento deben leerse como `note_path` con
>   `method: :delete` y `#destroy`.
> - Redirect tras archivar: **`/map`** (no `/yourself`). Razón en D-6.
> - El plan original incluía un test específico para los chips EN/ES/CA
>   en la row "whispers_in" deshabilitada. Se simplificó a una decoración
>   visual; el test del chip group cubre sólo la row "Interface".
>
> Plan detallado de la **Fase 7** descrita en
> [`doc/task_planning.md`](../task_planning.md). Cierra la tercera pestaña
> del tab bar (`me`), que hoy aparece deshabilitada con badge `SOON`, y
> añade la primera acción destructiva sobre notas propias: **archivar**.
>
> Referencias visuales: `prototype/profile-with-signout.jsx`
> (`SettingsScreen` + helpers `SectionLabel`, `SettingsRow`, `Chip`) y
> `prototype/GeoWhisper-prototype.html` para los tokens.
>
> Convenciones del repo aplicables: TDD obligatorio, fixtures antes que
> `create!` inline, i18n para todo string visible, RuboCop / Brakeman
> limpios, sin estilos inline, YARD en métodos públicos, comentarios y
> commits en inglés. Sin Capybara: cobertura por unit + controller +
> integration tests con `assert_select`.

---

## 1. Objetivos

1. **Pantalla `/yourself`** — perfil mobile-first replicando
   `SettingsScreen` del prototipo: header con eyebrow + título "Yourself",
   tarjeta de identidad (avatar-monograma + nombre + contador), secciones
   LANGUAGES / PRESENCE / YOUR TRAIL, frase manuscrita `be quiet, be here.`
   al pie y botón **Sign out**.
2. **Tab bar `me` activo** — el slot derecho del tab bar pasa de
   placeholder con `SOON` a link real a `/yourself`, con marcado activo
   cuando el usuario está en esa pantalla.
3. **Trail de notas propias** — log inverso-cronológico de **todas** las
   notas que el usuario ha creado, vivas o no. **Las notas archivadas y
   las expiradas siguen apareciendo en el trail** (atenuadas, con copy
   `archived` / `vanished N days ago`); sólo desaparecen del mapa /
   `nearby`. El trail es un historial personal, no un feed activo. La
   query del trail usa `@user.notes.order(created_at: :desc)` —
   **nunca** `.active` — y el contador "alive" sí se calcula con
   `.active.count`.
4. **Cambio de idioma desde el perfil** — la row "Interface" de la
   sección LANGUAGES envía a `LocalesController#update` reusando el
   endpoint existente, sin pantalla intermedia.
5. **Archivar nota propia** — desde `/notes/:id`, si el visor es el
   dueño, aparece un botón **Archive** en la action row. Confirma inline
   y la nota desaparece de `Note.active` (y por tanto de
   `/notes/nearby`).
6. **Logout desde el perfil** — botón al pie envía `DELETE /session`.

Lo que **no** entra en esta fase y queda en `future.md`:
- Editar el nombre / username del usuario (ahora se deriva del email).
- Onboarding de ciudad / reverse geocoding del eyebrow.
- Habilitar las rows con badge `SOON` (search radius, notify nearby,
  anonymous mode, "Show whispers in").
- Confirmación modal antes del logout (ver decisión D-3).
- Animación ink-bleed al archivar (la fase 5 cubre la animación de
  desaparición; aquí basta con el redirect + flash).

---

## 2. Decisiones tomadas

### D-1. Naming del contador

**Resuelto**: `dropped` / `alive` en inglés, `lanzadas` / `vivas` en
castellano, `llançades` / `vives` en catalán. Casa con el tono
*ephemeral* y mantiene consistencia léxica con los demás copys
("whispers", "fades in"). El prototipo usa `12 dropped · 4 still alive`,
así que en EN replicamos eso literalmente. En ES/CA usamos plural
contable con `I18n.t(..., count:)` para que el `1 lanzada · 0 vivas`
funcione.

### D-2. Trail row sin distancia

El visor no siempre conocerá su lat/lng cuando aterriza en `/yourself`
(p. ej. abre la app y va directo al perfil sin pasar por el mapa). En
ese caso **no** mostramos `--m` ni un placeholder ruidoso: omitimos el
segmento de distancia y dejamos solo `<estado · X/Y reads>`.

Si la nota está archivada o expirada (`Note.active` la excluye), la
distancia tampoco aplica → mostramos `archived · X/Y reads` o
`vanished N days ago` según el caso (ver §6 para la matriz exacta).

La distancia, cuando existe, se calcula server-side con
`Note#distance_to_m(lat, lng)` reutilizando el helper que ya consume el
mapa. Las coordenadas del visor llegan al perfil vía dos query params
opcionales (`lat`, `lng`) en el link del tab bar — el `map_controller.js`
los rellena cuando la geolocation está disponible. **Si los params
faltan, no se muestra distancia.** No persistimos la última posición en
sesión por simplicidad y por privacidad.

### D-3. UX del logout

Sin confirmación modal. El botón es `border` + texto `t.accent` (no
fondo rojo agresivo) — el prototipo ya marca el tono "destructivo
suave". El usuario puede volver a entrar con un click. Si en el futuro
añadimos sesiones largas / multidispositivo, reevaluamos.

### D-4. Empty state del trail

Cuando el usuario no tiene ninguna nota creada, la sección YOUR TRAIL
muestra un único bloque centrado con la copy `t("yourself.trail.empty")`
("You haven't dropped any whispers yet — the world is quiet from here."
en EN), tipografía `font-hand`, color `text-ink-soft`. No mostramos un
CTA explícito al compose porque ya está el FAB en el tab bar.

### D-5. Cambio de idioma reusa `LocalesController#update`

La row "Interface" no abre una vista intermedia. Renderizamos las tres
opciones (`EN`, `ES`, `CA`) como un grupo de chips dentro de la propia
row (mismo patrón que `Chip` del prototipo, marcando el activo con
`bg-accent text-bg`). Cada chip es un link `POST /locale?locale=xx` que
usa `button_to` con `method: :patch` (la acción está mapeada a
`resource :locale, only: :update`). Al volver, el flash confirma el
cambio.

Esto es coherente con cómo se cambia el idioma desde la cabecera de
sign-in. **No** se duplica lógica.

### D-6. Archivado: ruta, verbo HTTP y redirect

`DELETE /notes/:id` (acción `destroy` en `NotesController`, vía
`resources :notes, only: %i[... destroy]`). Usamos el verbo REST estándar
en lugar de un miembro custom porque archivar es la única forma de
"borrar" (soft-delete) que tenemos: las notas no se borran físicamente,
sólo se ocultan del scope `active`. `button_to ..., method: :delete` con
CSRF nativo de Rails.

Redirect: tras archivar, el usuario aterriza en `/map` con flash
`t("detail.archive.success")`. Razón: el detail screen se puede abrir
desde el mapa o desde el trail, y `/map` es el "home" estable del flujo.
La nota archivada queda visible en `/yourself → trail` con la etiqueta
`archived` cuando el usuario revisa su historial — no necesita un
redirect directo a esa pestaña.

### D-7. `Note.active` debe excluir archivadas

**Bug latente**: el scope actual no filtra `archived`, pero
`Note#view!` ya marca `archived: true` cuando se agotan las views. Es
decir: hoy una nota con `views_count >= max_views` se sale de `active`
por la condición `views_count < max_views`, no por `archived`. En el
momento en que añadamos `archive!` *manual* (sin tocar `views_count`),
la nota seguiría apareciendo en `nearby`.

**Acción**: ampliar el scope a
`where(archived: false).where("expires_at IS NULL OR expires_at > ?", ...).where("max_views IS NULL OR views_count < max_views")`.
Esto deja `view!` redundante (hoy marca `archived` además de chocar
contra el cap de views), pero la redundancia es defensiva y barata.

**Importante**: este filtro afecta sólo a `Note.active`, no al trail.
El trail consulta `@user.notes.order(...)` directamente para que el
historial sobreviva al archivado / expiración.

Tests del modelo `NoteTest#test_archived_excluded_from_active` cubren
el cambio. La fase 5 del backlog (job de purga) seguirá teniendo
sentido y purgará tanto archivadas como expiradas.

### D-8. Autorización del archivado

Sólo el dueño puede archivar. Cualquier otro usuario que intente
`POST /notes/:id/archive` recibe **404** (no 403) — preferimos no filtrar
la existencia de la nota a terceros. El visor del propietario ve el
botón; los demás no, así que la 404 es defensa en profundidad.

---

## 3. Rutas

```ruby
# config/routes.rb
get  "/yourself", to: "yourself#show", as: :yourself
resources :notes, only: %i[new create show] do
  member do
    post :archive
  end
end
```

`yourself_path` y `archive_note_path(note)` quedan disponibles.

---

## 4. Controllers

### 4.1 `YourselfController#show`

Nuevo. Hereda de `ApplicationController`, usa el `Authentication` concern
y el gate de onboarded igual que `MapController`.

```ruby
class YourselfController < ApplicationController
  before_action :require_authentication
  before_action :require_onboarded

  # Render the profile screen with identity card, settings rows,
  # whisper trail and sign-out button.
  #
  # @return [void]
  def show
    @user            = Current.user
    @notes_dropped   = @user.notes.count
    @notes_alive     = @user.notes.active.count
    @trail           = @user.notes.order(created_at: :desc).limit(50)
    @viewer_lat      = clamp_coord(params[:lat], -90.0, 90.0)
    @viewer_lng      = clamp_coord(params[:lng], -180.0, 180.0)
  end

  private

  def clamp_coord(raw, min, max)
    return nil if raw.blank?
    val = raw.to_f
    return nil if val.zero? && raw.to_s.strip != "0"
    val.clamp(min, max)
  end
end
```

Notas:
- `User#notes` necesita `has_many :notes, dependent: :destroy` (ya hay
  `belongs_to :user` en `Note`; falta el inverso). Añadir en `User`.
- `require_onboarded` es el helper que usa `MapController`; reutilizar
  o extraer a un concern si todavía vive en línea allí.
- El límite de 50 evita un trail descomunal en el render. Si un usuario
  ha creado más, la fase de paginación vive en `future.md`.

### 4.2 `NotesController` — botón Archive y acción `#archive`

Cambios:

1. `#show` — exponer `@is_owner = @note.user_id == Current.user.id` para
   que la vista decida si pinta el botón Archive.

2. `#archive` — nuevo:

```ruby
# Mark the current user's note as archived. Idempotent — archiving an
# already archived note is a no-op that still flashes success.
#
# @return [void]
def archive
  note = Current.user.notes.find_by(id: params[:id])
  return head :not_found unless note

  note.update!(archived: true) unless note.archived?
  redirect_to yourself_path, notice: t("notes.archive.success")
end
```

Idempotencia: el `unless note.archived?` evita escribir dos veces,
pero el flash siempre se muestra (el usuario verá `success` aunque la
nota ya estuviera archivada — UX más simple que un flash distinto).

`Current.user.notes.find_by` cubre la autorización (D-8): si no es
suya, `find_by` devuelve `nil` y respondemos 404.

---

## 5. Modelos

### 5.1 `User`

```ruby
has_many :notes, dependent: :destroy
```

### 5.2 `Note`

1. **Scope `active`** — incluir `archived: false` (D-7).
2. **`view!`** — el `self.archived = true` cuando se agotan las views
   queda redundante con el filtro del scope, pero lo dejamos como guard.
   No requiere cambio de comportamiento, sólo una nota YARD para que
   alguien que lea el código en frío entienda la doble red.
3. **No** añadimos `archive!` como método. La controller hace
   `update!(archived: true)` directo. Si el día de mañana el archivado
   dispara side effects (notificación, broadcast), promovemos a un
   método del modelo.

---

## 6. Vista `/yourself`

Archivo: `app/views/yourself/show.html.erb`. Mobile-first dentro de
`max-w-md mx-auto`. Replicar `SettingsScreen` del prototipo con clases
Tailwind y los tokens del proyecto (`bg-bg`, `bg-card`, `border-card-edge`,
`text-ink`, `text-ink-soft`, `text-ink-faint`, `text-accent`,
`bg-accent-soft`, `font-serif`, `font-mono`, `font-hand`, `font-sans`,
`tracking-eyebrow`, `rounded-card`, `rounded-button`, `shadow-card`).

### 6.1 Estructura

```
<div class="relative mx-auto flex min-h-screen max-w-md flex-col bg-bg pb-28">
  <header>                              <!-- eyebrow + titulo Yourself -->
  <main class="flex-1 overflow-auto px-[18px] pt-1.5">
    <section class="identity-card">     <!-- avatar + nombre + contador -->
    <h2 class="section-label">LANGUAGES</h2>
    <div class="settings-group">
      row whispers_in (disabled, SOON, chips EN/ES/CA)
      row interface (chip group EN/ES/CA, click → POST /locale)
    </div>
    <h2>PRESENCE</h2>
    <div class="settings-group">
      row search_radius (disabled, SOON, "1 km")
      row notify (disabled, SOON, "Sometimes")
      row anonymous (disabled, SOON, "Off")
    </div>
    <h2>YOUR TRAIL</h2>
    <div class="trail-group">
      <% @trail.each do |note| %>
        <%= render "trail_row", note:, viewer_lat: @viewer_lat, viewer_lng: @viewer_lng %>
      <% end %>
      <% if @trail.empty? %>
        <p class="font-hand text-ink-soft">…empty state…</p>
      <% end %>
    </div>
    <p class="tagline font-hand">be quiet, be here.</p>
    <%= button_to t("yourself.sign_out"), session_path, method: :delete,
          class: "sign-out-btn" %>
    <p class="version-line font-mono text-ink-faint">v 0.1 · <%= Current.user.email.upcase %></p>
  </main>
  <%= render "shared/tab_bar", active: :me %>
</div>
```

### 6.2 Identity card

- Avatar: cuadrado redondeado de 56 px, fondo `bg-accent-soft`,
  borde `border-card-edge`, texto `font-serif text-2xl text-accent`,
  inicial = `Current.user.email.first.upcase`.
- Nombre: parte local del email (lo que está antes del `@`),
  capitalizado. Es lo más cercano a un "username" que tenemos.
- Contador: `t("yourself.counter.line",
  dropped: t("yourself.counter.dropped", count: @notes_dropped),
  alive: t("yourself.counter.alive", count: @notes_alive))`
  → renderiza p. ej. `12 lanzadas · 4 vivas`. Las claves
  `.dropped` / `.alive` usan plurales. Ver §8.

### 6.3 Trail row (`_trail_row.html.erb`)

Recibe `note`, `viewer_lat`, `viewer_lng`. Calcula:

- `is_alive  = !note.archived? && (note.expires_at.nil? || note.expires_at > Time.current) && (note.max_views.nil? || note.views_count < note.max_views)`
- `is_archived = note.archived?`
- `dot_class = is_alive ? "bg-accent" : "bg-ink-faint"`
- `row_class = is_alive ? "" : "opacity-45"`
- `distance = (viewer_lat && viewer_lng && is_alive) ? note.distance_to_m(viewer_lat, viewer_lng) : nil`

Meta-line por estado (matriz):

| Estado | Distancia? | Meta-line |
|---|---|---|
| Alive, hay coords | Sí | `<distancia>m · alive · X/Y reads` (o `· unlimited reads`) |
| Alive, sin coords | No | `alive · X/Y reads` |
| Archived | No | `archived · X/Y reads` |
| Vanished (tiempo o views) | No | `vanished N days ago` |

Para "vanished N days ago" usamos `time_ago_in_words(reference)` donde
`reference = note.expires_at` si expiró por tiempo, o
`note.updated_at` si fue por views/archivado. Si `time_ago_in_words`
devuelve "less than a minute" lo dejamos pasar — es aceptable.

Cada row es un `link_to note_path(note, lat: viewer_lat, lng: viewer_lng)`
para que el detail screen pueda recalcular la distancia en su eyebrow
(coherente con cómo el mapa pasa la posición).

### 6.4 Chip group para "Interface"

Tres `button_to` (uno por locale) dentro de un `<div class="flex gap-1">`,
cada uno renderiza la abreviatura (EN/ES/CA) y aplica `bg-accent text-bg`
si `I18n.locale.to_s == code`, `bg-bg-deep text-ink-soft` en caso
contrario. Cada `button_to` apunta a `locale_path(locale: code)` con
`method: :patch` (corresponde a `resource :locale, only: :update` →
PATCH/PUT).

### 6.5 Sign-out button

`button_to t("yourself.sign_out"), session_path, method: :delete,
class: "..."`. Tailwind: `w-full rounded-card border border-card-edge
bg-card px-4 py-3.5 font-sans text-[15px] font-medium text-accent
inline-flex items-center justify-center gap-2`. Icono opcional `back`
SVG inline.

### 6.6 Tab bar — slot `me`

Editar `app/views/shared/_tab_bar.html.erb`:

- Cambiar el `<span>` deshabilitado por `link_to yourself_path(lat: ..., lng: ...)`.
- Las coordenadas se inyectan vía `data-controller="geolocation"` en el
  contenedor del tab bar — pero el link es server-rendered, así que más
  simple: el Stimulus `map_controller.js` rellena los `data-href` o un
  `URLSearchParams` antes de submit. **Decisión simple**: no rellenamos
  coords en el link del tab bar; queda `lat`/`lng` en `nil` y el trail
  no muestra distancias cuando se entra desde el tab. Se siente
  aceptable y evita complicar el tab bar con JS.

  Si más adelante queremos coords en el perfil, el patrón limpio es
  guardar la última lectura en `sessionStorage` y reescribir
  el `href` del tab `me` cuando cambia.
- `active = :me` cuando estamos en `/yourself` — `MapController` ya pasa
  `:map`; añadir el render con `active: :me` en `yourself/show.html.erb`.

### 6.7 Vista `notes/show` — botón Archive

Reemplazar el botón "Report" deshabilitado por el botón **Archive**
cuando `@is_owner`:

```erb
<% if @is_owner %>
  <%= button_to archive_note_path(@note), method: :post,
        class: "...rounded-button bg-card border border-card-edge text-accent...",
        data: { turbo_confirm: t("notes.archive.confirm") } do %>
    <svg>…</svg>
    <%= t("notes.archive.cta") %>
  <% end %>
<% else %>
  <button … disabled> Report (existente) </button>
<% end %>
```

`turbo_confirm` da una confirmación nativa del navegador antes de
archivar. No es un modal estilizado, pero protege de taps accidentales
sin trabajo extra. (Si la copy se ve fea, lo quitamos al revisar UI.)

---

## 7. CSS / Tailwind

No se prevén tokens nuevos. El prototipo usa colores y radios que ya
tienen mapeo en `tailwind.config.js`. Verificar que existen y, si no,
añadirlos antes de codificar la vista (según la regla "no inline
styles").

Posibles utilidades nuevas si no existen ya:
- `tracking-eyebrow` (ya usado en map / detail).
- `rounded-card`, `rounded-button`, `rounded-hero` (ya en uso).

Si todo está, esta sección es no-op.

---

## 8. i18n

Claves a añadir en `config/locales/{en,es,ca}.yml` (mantener paridad).
`I18nParityTest` validará que las tres locales tienen el mismo árbol.

```yaml
en:
  nav:
    me: Me            # ya existe; el badge SOON desaparece, mantener clave
  yourself:
    title: Yourself
    eyebrow: "@%{handle}"            # ej. @ALICE — ciudad queda fuera por D-1
    counter:
      dropped:
        one: "1 dropped"
        other: "%{count} dropped"
      alive:
        one: "1 still alive"
        other: "%{count} still alive"
      line: "%{dropped} · %{alive}"
    sections:
      languages: LANGUAGES
      presence:  PRESENCE
      trail:     YOUR TRAIL
    rows:
      whispers_in: "Show whispers in"
      interface: "Interface"
      search_radius: "Search radius"
      notify: "Notify me when nearby"
      anonymous: "Anonymous mode"
    placeholders:
      search_radius: "1 km"
      notify: "Sometimes"
      anonymous: "Off"
    soon_badge: SOON
    trail:
      empty: "You haven't dropped any whispers yet — the world is quiet from here."
      meta:
        alive_with_distance: "%{distance}m · alive · %{reads}"
        alive_no_distance:   "alive · %{reads}"
        archived:            "archived · %{reads}"
        vanished_ago:        "vanished %{time} ago"
      reads:
        capped:    "%{count}/%{max} reads"
        unlimited: "unlimited reads"
    sign_out: Sign out
    tagline: "be quiet, be here."
    version_line: "v 0.1 · %{handle}"
  notes:
    archive:
      cta: Archive
      confirm: "Archive this whisper? It will disappear from the map."
      success: "Whisper archived. It's no longer drifting around."
```

Versión ES (extracto crítico):

```yaml
es:
  yourself:
    title: Tú
    counter:
      dropped:
        one: "1 lanzada"
        other: "%{count} lanzadas"
      alive:
        one: "1 viva"
        other: "%{count} vivas"
    sections:
      languages: IDIOMAS
      presence:  PRESENCIA
      trail:     TU RASTRO
    sign_out: Cerrar sesión
    tagline: "estate quieto, estate aquí."
  notes:
    archive:
      cta: Archivar
      success: "Susurro archivado. Ya no flota por ahí."
```

Versión CA:

```yaml
ca:
  yourself:
    title: Tu
    counter:
      dropped:
        one: "1 llançada"
        other: "%{count} llançades"
      alive:
        one: "1 viva"
        other: "%{count} vives"
    sections:
      languages: IDIOMES
      presence:  PRESÈNCIA
      trail:     EL TEU RASTRE
    sign_out: Tanca la sessió
    tagline: "calla, sigues aquí."
  notes:
    archive:
      cta: Arxivar
      success: "Xiuxiueig arxivat. Ja no voleteja per allà."
```

(La copy final se afina en revisión; este plan fija la estructura.)

---

## 9. Tests

TDD: cada bullet abajo es un test que se escribe ANTES del código de
producción.

### 9.1 `NoteTest`

- `test_archived_excluded_from_active` — crea nota archivada con
  fixture, asserta que `Note.active` no la contiene.
- `test_archive_keeps_views_count_and_expires_at_intact` — sanity check
  de que setear `archived` no toca otros campos (regresión D-7).

### 9.2 `UserTest`

- `test_user_has_many_notes_dependent_destroy` — borrar usuario borra
  sus notas.

### 9.3 `YourselfControllerTest` (nuevo,
`test/controllers/yourself_controller_test.rb`)

- Auth gate: visitor anónimo → redirect a `/session/new`.
- Onboarded gate: usuario sin `onboarded_at` → redirect a `/welcome`.
- Render OK: status 200, `assert_select "h1"` con el título traducido,
  `assert_select` para el contador, las tres secciones, el bloque
  trail y el botón sign-out (form `DELETE /session`).
- Contador correcto: fixtures con N notas vivas + M archivadas →
  `assert_select` que el texto contiene "N+M lanzadas" y "N vivas".
- Trail ordenado por `created_at desc` y limitado a 50.
- Trail vacío: usuario sin notas → renderiza copy `yourself.trail.empty`.
- Search radius row presente con badge SOON y atributo `disabled` /
  `aria-disabled` (no debe linkar a ninguna acción).
- `lat`/`lng` válidos: trail row de una nota viva incluye los metros
  (`assert_select "*", text: /\d+m/`); con `lat`/`lng` ausentes, no.
- `lat` fuera de rango → se ignora (clamp a nil), no crash.

### 9.4 `NotesControllerTest`

- `#show` para el dueño: botón Archive presente
  (`assert_select "form[action=?][method=post]", archive_note_path(note)`).
- `#show` para extraño: botón Archive ausente; botón Report sigue
  visible.
- `#archive` con dueño: redirige a `/yourself`, flash success, nota
  pasa a `archived: true`.
- `#archive` con extraño: 404, nota intacta.
- `#archive` con anónimo: redirect a `/session/new`.
- `#archive` idempotente: archivar dos veces no falla, segunda llamada
  sigue 302 a `/yourself` con flash success.
- Efecto en `nearby`: tras archivar, `/notes/nearby?lat=&lng=` ya no
  incluye la nota.

### 9.5 `LocalesControllerTest` (existente)

- Nada cambia. Verificación manual en code review de que la nueva row
  "Interface" envía PATCH al endpoint correcto.

### 9.6 Integration test
`test/integration/yourself_flow_test.rb`

- Login → `/yourself` → trail vacío.
- POST a `/notes` con coords y contenido → vuelve a `/yourself` →
  el trail muestra la nota nueva.
- GET `/notes/:id` → POST `/notes/:id/archive` → redirect a `/yourself`
  con flash → la nota aparece atenuada con `archived` en la meta-line.
- GET `/notes/nearby?lat=…&lng=…` → la nota archivada NO aparece.

### 9.7 `I18nParityTest`

Debe seguir verde tras añadir las claves nuevas. Si falla, faltan
traducciones en alguna locale.

### 9.8 Tab bar

Como el render del tab bar se cubre desde múltiples controllers, no
escribimos un test dedicado: las assertions sobre el slot `me` se
incluyen dentro de `MapControllerTest` (link a `/yourself`, no badge
SOON) y `YourselfControllerTest` (slot `me` activo).

---

## 10. Riesgos y mitigaciones

- **R-1: ampliar `Note.active` rompe tests existentes** — un test que
  asume que una nota archivada sigue apareciendo dejaría de pasar.
  *Mitigación*: ejecutar `bin/rails test test/models test/controllers`
  antes y después; revisar los fallos uno a uno. La probabilidad es
  baja porque el atributo `archived` solo se setea en `view!` cuando
  `views_count >= max_views`, condición que el scope ya filtraba.

- **R-2: `current_user&.update(language: locale)` en
  `LocalesController` no aplica al volver al perfil** — el flujo es
  request → update → redirect_back → render `/yourself`. La nueva
  `I18n.locale` se aplica en el siguiente request (vía
  `ApplicationController#set_locale`), así que la pantalla **sí**
  refleja el cambio. Verificar con un test integration explícito.

- **R-3: `Current.user.notes.find_by` y CSRF en `button_to`** — el
  formulario debe llevar el authenticity token (Rails lo hace por
  defecto, pero si en algún momento se cambia a `link_to ...,
  data: { turbo_method: :post }` perdemos CSRF nativo). Mantener
  `button_to`.

- **R-4: `time_ago_in_words` y locales** — Rails localiza esa helper
  vía `datetime.distance_in_words.*`. Verificar que las claves existen
  en `es` y `ca` (vienen con `rails-i18n` si está instalado; si no,
  las añadimos al YAML del proyecto).

- **R-5: paginación del trail** — sin paginación, un usuario power
  con miles de notas renderiza un HTML enorme. Mitigado por el
  `.limit(50)`. Anotar en `future.md` la paginación con cursor.

---

## 11. Checklist de cierre

- [ ] Migraciones: ninguna (la columna `archived` ya existe en schema).
- [ ] `User#notes` con `dependent: :destroy`.
- [ ] `Note.active` filtra `archived: false`; YARD actualizado.
- [ ] `routes.rb`: `/yourself` GET + `notes#archive` POST member.
- [ ] `YourselfController#show` con auth + onboarded gate.
- [ ] `NotesController#archive` + `@is_owner` en `#show`.
- [ ] Vista `app/views/yourself/show.html.erb` y partial
      `_trail_row.html.erb`.
- [ ] Tab bar: slot `me` activo, link real, sin badge SOON.
- [ ] Vista `notes/show.html.erb`: botón Archive condicional.
- [ ] i18n: bloque `yourself.*` y `notes.archive.*` en EN/ES/CA.
- [ ] Tests: model, controllers, integration — todos verdes.
- [ ] `bin/rails test`, `bin/rubocop`, `bin/brakeman` limpios.
- [ ] Marcar las casillas de la Fase 7 en
      [`doc/task_planning.md`](../task_planning.md).
- [ ] Anotar en `doc/future.md` la paginación del trail y el
      reverse-geocoding del eyebrow del header.
