# Plan — Fase 2: Mapa interactivo + Compose UI (sin dependencia del modelo `Note`)

> **Sobre la branch `phase-2/map-and-compose-ui`.** Trabajamos en paralelo con
> el colega que está implementando el modelo `Note` (Fase 1 de
> [`task_planning.md`](../task_planning.md)). Esta tanda construye la capa
> de **mapa, compose y detail** consumiendo un **stub de datos** en
> servidor; cuando el modelo aterrice, se sustituye una sola clase y el
> resto del código se mantiene.
>
> Cubre conceptualmente las **Fases 2, 3 y 4** del task_planning operativo
> (creación, descubrimiento por cercanía y mapa) — el límite es lo que se
> puede hacer sin persistencia real de notas.
>
> **Decisiones técnicas y motivaciones** viven en
> [`../decisions.md`](../decisions.md). **API contract** entre cliente y
> servidor está más abajo en este plan.

---

## Estado actual (retroactivo)

Lo que ya existe en `main` y se reutiliza:

- [X] **Ruta `GET /map`** en `config/routes.rb` con su `MapController#show`. Hace de gate: redirige a `/welcome` si `current_user.onboarded_at` es `nil`.
- [X] **Vista `map/show.html.erb`** placeholder. Sustituida en este sprint por la pantalla del prototipo.
- [X] **`geolocation_controller.js`** Stimulus que dispara `navigator.geolocation.getCurrentPosition` antes de submitir un form, con un target opcional `denied`. Se reutiliza para Compose.
- [X] **`onboarded_at` flow** — usuarios con `onboarded_at` aterrizan en `/map`; sin él, en `/welcome`.
- [X] **Tokens de diseño** y fuentes ya configurados en Tailwind.

Lo que **falta** y vive en este plan:

- [ ] Leaflet self-hosted (no CDN).
- [ ] Stub server-side de notas + endpoint JSON.
- [ ] Vista `/map` real con header, peek card, bottom nav.
- [ ] Stimulus `map_controller.js` para Leaflet + markers.
- [ ] Bottom nav (TabBar) Map / Drop / Me.
- [ ] Toggle Map ↔ List en el header de `/map`.
- [ ] Empty + denied states.
- [ ] Compose UI (`/notes/new`) — siempre stub-success por ahora.
- [ ] Detail UI (`/notes/:id`) invocando `view!` (no-op en stub).

---

## Decisiones técnicas

### 1. Stub de datos: `Notes::Catalog` en memoria

Mientras no hay modelo `Note`, exponemos una clase con la **misma forma** que tendrá la query final:

```ruby
# app/models/notes/catalog.rb
module Notes
  Stub = Struct.new(:id, :content, :latitude, :longitude,
                    :expires_at, :max_views, :views_count, :language,
                    :user_id, keyword_init: true) do
    # Stub no-op so callers can invoke #view! today; real Note will
    # increment views_count atomically.
    def view!
      # TODO[phase-1-merge]: replace with real Note#view! semantics.
      self
    end

    def time_left_seconds
      return nil if expires_at.nil?
      [(expires_at - Time.current).to_i, 0].max
    end

    def views_remaining
      return nil if max_views.nil?
      [max_views - views_count, 0].max
    end
  end

  module Catalog
    DATA = [...].freeze  # see step A2 for fixtures

    def self.nearby(lat:, lng:, radius_m: 1000) ; ... ; end
    def self.find(id) = DATA.find { _1.id == id.to_i }
  end
end
```

Razones:

- **Forma idéntica** a la del futuro `Note` (mismas columnas, mismos métodos públicos): el sustituto es directo.
- `Struct` con `keyword_init` simula bastante bien un AR record.
- **En memoria**, sin migración temporal que luego haya que tirar.
- **Distancia**: Haversine en Ruby, basta para el stub.
- **`view!` ya existe** como no-op para que el `NotesController#show` lo invoque desde el día 1; cuando aterrice `Note`, incrementa de verdad.

### 2. JSON API contract — `/notes/nearby.json`

Endpoint que el cliente (Stimulus map controller) consume para pintar markers.

**Request:**
```
GET /notes/nearby.json?lat=41.4036&lng=2.1744&radius=1000
```

- `lat`, `lng` (float, required)
- `radius` (int, opcional, metros, default 1000, cap 5000)

**Response (simplificado):**
```json
{
  "notes": [
    {
      "id": 1,
      "content": "Sit by the window — they bring out the saffron buns at 4.",
      "latitude": 41.4036,
      "longitude": 2.1744,
      "distance_m": 12,
      "language": "en",
      "time_left_seconds": 7228,
      "views_remaining": 3
    }
  ]
}
```

- Coordenadas siempre WGS84 decimal.
- `distance_m`, `time_left_seconds` y `views_remaining` se calculan en server. **No exponemos `expires_at` ni `max_views` raw**: el cliente solo necesita lo que pinta (progress bars y countdown), no las primitivas que las generan. Esto:
  - Reduce la superficie del contrato.
  - Esconde el reloj del servidor (cliente no se equivoca de TZ).
  - Permite cambiar la semántica de expiración sin renegociar JSON.
- `time_left_seconds` puede ser `null` (nota permanente).
- `views_remaining` puede ser `null` (sin cap de vistas).
- `language`: ISO 639-1, dos letras.

**Error responses:** sin lat/lng → `422` con `{"error": "lat and lng are required"}`. Radio fuera de rango → `422`.

### 3. Leaflet **self-hosted** (sin CDN)

Decidido: no dependemos de CDNs externos.

- **JS:** descargar `leaflet-src.esm.js` (1.9.4) y dejarlo en `vendor/javascript/leaflet.esm.js`. Pin en `config/importmap.rb`:
  ```ruby
  pin "leaflet", to: "leaflet.esm.js"
  ```
  El `manifest.js` ya tiene `link_tree ../../vendor/javascript .js`, así que Sprockets sirve el fichero con digest.
- **CSS:** descargar `leaflet.css` (1.9.4) y dejarlo en `vendor/stylesheets/leaflet.css`. Cargarlo desde `application.html.erb` con `<%= stylesheet_link_tag "leaflet" %>` (añadir el path al manifest si hace falta).
- **Imágenes** (markers default, layers): vendoreamos también `marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png`, `layers.png`, `layers-2x.png` en `vendor/javascript/images/` y le decimos a Leaflet dónde están vía `L.Icon.Default.imagePath`.
- **Tiles:** OpenStreetMap directo (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) con attribution. Sin API key, pero esto **sí** depende de OSM. Aceptado: caer aquí significa caer en el mapa entero y es ineludible si queremos OSM gratis.

Beneficio: en demo offline (proyector con WiFi malo) Leaflet carga desde el server local; lo único externo son los tiles, que se pueden cachear pre-demo si hace falta.

### 4. TabBar mobile-first

Bottom nav fijo, tres slots, exactamente como el prototipo (`atoms.jsx :: TabBar`):

- **Map** — `pin` icon, lleva a `/map`.
- **Drop** — `feather` icon, FAB centrado terracota elevado, lleva a `/notes/new`.
- **Me** — `user` icon, badge SOON disabled (la ruta `/profile` no existe aún).

Implementado como partial `app/views/shared/_tab_bar.html.erb` con un parámetro `active`. Se renderiza en `/map` y `/notes/*`. Login/signup/welcome **no** lo muestran.

### 5. Toggle Map ↔ List dentro del header del `/map`

Segmented control en la top bar. Sin route adicional — solo cambia el render server-side basándose en `params[:view]` (`map` default, `list` opcional). Misma data, distinta presentación (la lista usa `WhisperCard`).

### 6. Compose form (`/notes/new`) — UI completa, **stub success**

UI siguiendo `prototype/screens-2.jsx :: ComposeScreen`. **No persiste nada** todavía:

- `NotesController#new` instancia un `Notes::ComposeForm` (un `ActiveModel::Model` light) para que el helper `auth_field`-equivalente funcione con errores inline.
- `POST /notes` (`#create`):
  - Valida lo mínimo en el form object: `content` presente y ≤ 500 chars, `lat`/`lng` presentes y dentro de rangos válidos.
  - Si todo OK: **siempre** `flash[:notice] = t("compose.success_stub")` y redirect a `/map`. **No se guarda nada** — solo se simula éxito.
  - Si validación falla: re-renderiza con errores inline.
- **TODO marcado en el código** y entrada explícita en `next-steps.md`: cuando aterrice el modelo `Note`, sustituir la línea de "fake success" por `Note.create!(form.to_note_params)`.

Selectores y campos: ver paso G más abajo.

### 7. Detail view (`/notes/:id`)

UI siguiendo `prototype/screens-3.jsx :: DetailScreen`:

- Lee desde `Notes::Catalog.find(params[:id])`.
- **Invoca `note.view!`** ya — el stub responde como no-op; cuando aterrice el modelo, incrementa el contador.
- "Ink-bleed vanish" del prototipo se reduce a un fade simple (CSS `opacity transition`).

### 8. Denied state — inline en `/map` (Opción A)

Estado dentro de `/map`, sin ruta separada:

- Stimulus `map_controller.js` pide `getCurrentPosition` al `connect`.
- Si falla → cambia `data-state="denied"` en el wrapper, que muestra el partial `_denied_state.html.erb` (instrucciones + botón "Try again").
- "Try again" re-dispara el prompt.
- **No redirigimos a `/welcome`** — UX menos invasiva. Si el usuario insiste en denegar, el mapa se queda en denied state hasta que conceda permiso o salga.

### 9. Stub de datos: ¿dónde vivir?

Una sola clase `Notes::Catalog` con `DATA` constante. **No** la exponemos en `seeds.rb` (es solo demo, no toca BBDD). Cuando aterrice `Note`, se borra `app/models/notes/catalog.rb` y `NotesController` queda apuntando a `Note`.

---

## API contract (resumen para integración con Fase 1 del colega)

| Endpoint | Stub ahora | Real cuando aterrice `Note` |
|---|---|---|
| `GET /notes/nearby.json` | `Notes::Catalog.nearby(...).map(&:as_json_payload)` | `Note.active.nearby(lat:, lng:, radius_m:).map(&:as_json_payload)` |
| `GET /notes/:id` | `Notes::Catalog.find(...).tap(&:view!)` | `Note.active.find(...).tap(&:view!)` |
| `POST /notes` | valida form + `flash success` (no persiste) | `Note.create!(form.to_note_params)` con manejo real de errores |

Modelo `Note` (forma esperada — para alinear con el colega):

```ruby
# Esperado en Phase 1:
# Columns: id, content, latitude, longitude, expires_at, max_views,
#          views_count, user_id, visibility (enum), language, timestamps.
# expires_at: nullable. max_views: nullable.
# Public methods: .nearby(lat:, lng:, radius_m:), scope :active,
#                 instance#view!, instance#time_left_seconds,
#                 instance#views_remaining, instance#as_json_payload.

class Note < ApplicationRecord
  scope :active, -> {
    where("expires_at IS NULL OR expires_at > ?", Time.current)
      .where("max_views IS NULL OR views_count < max_views")
  }

  def self.nearby(lat:, lng:, radius_m: 1000)
    # bounding box + Haversine, ordenado por distancia
  end
end
```

Si el colega lo implementa diferente (renombra columnas, cambia firma), **abrimos issue y alineamos antes de hacer merge**.

---

## Pasos de implementación

### A. Stub de datos (1 clase + tests)

1. Crear `app/models/notes/catalog.rb` con `Stub` Struct (incluye `view!`, `time_left_seconds`, `views_remaining`, `as_json_payload`) y `Catalog` module (`nearby`, `find`).
2. Hardcodear notas demo:
   - 6 alrededor de **EPSEVG** (Vilanova i la Geltrú).
   - 2 alrededor de **Plaça Reial** (Barri Gòtic).
   - 1 en **Campus Nord** (UPC Barcelona).
   Copy realista en mezcla `en`/`es`/`ca`, TTLs y max_views variados (incluyendo 1 con `expires_at: nil` y otra con `max_views: nil` para validar el contrato del null).
3. Tests: `Notes::CatalogTest` cubriendo `nearby` (en/dentro/fuera de radio, ordenación por distancia, cap del radio en 5000m), `find` (id existente / no existente), `Stub#view!` no-op, `Stub#time_left_seconds` y `views_remaining` con casos `nil`.

### B. Endpoint JSON `/notes/nearby.json`

4. Routes: `resources :notes, only: %i[new create show]` + `get "/notes/nearby" => "notes#nearby", as: :nearby_notes` (defaults: `format: :json`).
5. `NotesController#nearby` — valida params (lat/lng required, radio cap 5000), llama a `Notes::Catalog.nearby`, devuelve JSON con la forma del contrato (vía `as_json_payload`).
6. Tests: `NotesControllerTest#nearby` (auth required, params válidos/inválidos, JSON shape, `null` correcto en `time_left_seconds` y `views_remaining`).

### C. Leaflet self-hosted

7. Descargar Leaflet 1.9.4:
   - `vendor/javascript/leaflet.esm.js` ← `leaflet-src.esm.js`
   - `vendor/stylesheets/leaflet.css` ← `leaflet.css`
   - `vendor/javascript/images/{marker-icon,marker-icon-2x,marker-shadow,layers,layers-2x}.png`
8. Pin en `config/importmap.rb`: `pin "leaflet", to: "leaflet.esm.js"`.
9. Verificar `app/assets/config/manifest.js` ya tiene `link_tree ../../vendor/javascript .js`. Añadir si hace falta el directorio `vendor/stylesheets`.
10. Cargar CSS desde `application.html.erb`: `<%= stylesheet_link_tag "leaflet", "data-turbo-track": "reload" %>`.
11. Configurar `L.Icon.Default.imagePath` para apuntar al asset path correcto (los markers default tienen rutas hardcoded que rompen con asset digests).
12. Smoke check: `bin/rails tailwindcss:build` y `bin/importmap audit`. Tests verdes.

### D. Vista `/map` con el chrome del prototipo

13. Reescribir `app/views/map/show.html.erb` siguiendo `prototype/screens-1.jsx :: MapScreen`:
    - Top header: monograma `g.` + chip de contador (`{count} ghosts`) + segmented control Map/List.
    - Contenedor del mapa con `data-controller="map" data-map-nearby-url-value="<%= nearby_notes_path(format: :json) %>"`.
    - Peek card inferior con la nota más cercana (parcial `_whisper_card.html.erb`).
    - Bottom nav (`shared/_tab_bar.html.erb`).
    - Bloques ocultos para empty y denied states.
14. Crear partial `app/views/shared/_whisper_card.html.erb` siguiendo `atoms.jsx :: WhisperCard`.
15. Crear partial `app/views/shared/_tab_bar.html.erb` con tres botones (Map activo, Drop FAB enabled, Me con badge SOON disabled).

### E. Stimulus `map_controller.js`

16. Nuevo controller `app/javascript/controllers/map_controller.js`:
    - On connect: `navigator.geolocation.getCurrentPosition`.
    - Granted: instancia `L.map`, añade tile layer OSM con attribution `© OpenStreetMap contributors`, fetch al `nearbyUrlValue`, pinta markers.
    - Marker "you are here": `divIcon` HTML con CSS `animation: pulse` (keyframes en `application.tailwind.css`).
    - Markers de notas: `divIcon` terracota; popup que linkea a `/notes/:id`.
    - Denied: aplica `data-state="denied"` al wrapper. Botón "Try again" re-dispara `getCurrentPosition`.
17. Sin tests JS automatizados (sin Capybara). El JSON endpoint se cubre solo a nivel servidor.

### F. List / Empty / Denied states

18. Si `params[:view] == "list"`: renderizar `<ul>` de `WhisperCard`s en lugar del mapa. Misma data, otro contenedor.
19. Empty: si la respuesta del endpoint trae 0 notas, el JS intercambia el peek card por el bloque `_empty_state.html.erb` (ghost glyph + headline + trilingual preview row del prototipo).
20. Denied: el partial `_denied_state.html.erb` con instrucciones de cómo activar permisos + botón "Try again".

### G. Compose `/notes/new` + `POST /notes` (stub-success)

21. Crear `app/forms/notes/compose_form.rb` (`ActiveModel::Model`) con: `content`, `latitude`, `longitude`, `expires_at`, `max_views`, `language`, `visibility`. Validaciones: `content` presente y ≤ 500, `latitude`/`longitude` presentes en rangos válidos, `expires_at > Time.current` *si presente*, `max_views >= 1` *si presente*. Caps de UI: TTL ≤ 30 días, `max_views` ≤ 1000 (los caps se aplican en el form, no en el modelo, alineado con `decisions.md`).
22. `NotesController#new` — `@form = Notes::ComposeForm.new`.
23. Vista `notes/new.html.erb` siguiendo `screens-2.jsx :: ComposeScreen`:
    - Hidden `latitude`/`longitude` autocompletadas por un Stimulus controller (puede ser el `geolocation_controller.js` existente con un nuevo target, o un controller hermano `compose_controller.js`).
    - Textarea para `content` (max 500, contador visible en mono pequeñito).
    - Selector TTL (quick-pick `15min` / `1h` / `1día` / `1 semana` + custom `<input type="number">` + selector de unidad).
    - Selector `max_views` (quick-pick `1` / `5` / `25` / `100` + custom).
    - Visibility: tres chips, **`public` enabled (default seleccionado), `friends` y `whisper` mostrados disabled con badge SOON** (educa sobre el roadmap).
    - CTA "Leave it here" terracota.
24. `NotesController#create` — `@form = Notes::ComposeForm.new(...)`. Si `@form.valid?`:
    ```ruby
    # TODO[phase-1-merge]: replace this fake-success with
    #   Note.create!(@form.to_note_params)
    # once the Note model lands in main.
    redirect_to map_path, notice: t("compose.success_stub")
    ```
    Si no, render `:new` con `status: :unprocessable_entity`.
25. Tests: `Notes::ComposeFormTest` (validaciones); `NotesControllerTest#new` y `#create` (form válido → redirect+flash; inválido → 422 con errores; `expires_at` futuro y `max_views >= 1`).
26. **Apuntar en `next-steps.md`** una entrada explícita: "Sustituir stub-success en `NotesController#create` por persistencia real al fusionar la rama Note del colega".

### H. Detail `/notes/:id`

27. `NotesController#show` — `@note = Notes::Catalog.find(params[:id])`. 404 si no existe. Llama a `@note.view!` (no-op en stub).
28. Vista `notes/show.html.erb` siguiendo `screens-3.jsx :: DetailScreen`:
    - Header con back button al `/map`.
    - Card grande con el `content` en serif 17/23.
    - Lifecycle bars (`FADES IN` y `READS LEFT`) con barras de progreso terracota basadas en `time_left_seconds` y `views_remaining`.
    - Botón "Whisper back" disabled con badge SOON (Fase 7).
29. Tests: 404 cuando no existe, 200 cuando existe, render del fade-state correcto cuando `time_left_seconds == 0` o `views_remaining == 0`.

### I. Pulido y commit

30. `bin/rubocop` limpio.
31. `bin/brakeman` sin alertas nuevas.
32. `bin/rails test` verde.
33. Commit con todo el trabajo y push de la branch.
34. Smoke test manual en navegador (lo hace el usuario).
35. Abrir PR a `main` con resumen del contrato JSON y del TODO de integración.

---

## Lo que NO se toca en esta tanda

- **Modelo `Note`**, scope `active`, validaciones de modelo, migración — **dependencia de Fase 1 del colega.**
- **Persistencia real** del `POST /notes` — solo flash + redirect (TODO marcado).
- **Incremento real de views** en el detail — `view!` se invoca pero el stub es no-op.
- **Job de purga de expiradas** (Fase 5).
- **Pantalla `/profile`** (Fase 6 / future).
- **Ink-bleed vanish** del detail — fade simple en MVP.
- **PWA add-to-home-screen** (Fase 6).
- **Refresh periódico del mapa** — apuntado en `future.md` (no para demo).

---

## Integración con Phase 1 (cuando aterrice el modelo `Note`)

Cambios al hacer merge:

1. **Borrar** `app/models/notes/catalog.rb` y `test/models/notes/catalog_test.rb`.
2. **`NotesController`**:
   - `Notes::Catalog.nearby(...)` → `Note.active.nearby(...)`.
   - `Notes::Catalog.find(...)` → `Note.active.find(...)`.
   - `flash + redirect` en `#create` → `Note.create!(@form.to_note_params)` con manejo de errores reales.
3. **Confirmar** que la firma de `Note.nearby` coincide con el contrato (mismo nombre de keyword args, mismo retorno). Si no, ajustar el controller.
4. **`view!`** en el detail pasa de no-op a incrementar real.
5. **Probar end-to-end** que crear una nota la hace visible en el mapa al recargar.
6. **Borrar tests del Catalog**, escribir/heredar los del modelo real.

Esta es la única superficie de integración. Si el contrato se respeta, vistas + JS + tabbar + partials + form object no requieren cambios.

---

## Riesgos

- **Schema mismatch con el colega.** Mitigado documentando el contrato; antes de merge revisamos qué columnas y firmas tiene su `Note`.
- **OSM tiles**. Si OSM cae o se rate-limita, el mapa pierde tiles. No depende de nosotros. Plan B: cachear pre-demo o cambiar a Stadia free tier (con API key).
- **Permisos GPS revocados a posteriori** mientras estás en `/map`. Reintentamos `getCurrentPosition` en `visibilitychange` cuando la ventana vuelve a foreground.
- **Contador de markers vs respuesta async.** Si la geolocation tarda, el header muestra `—` hasta que llega la primera respuesta del JSON endpoint.
- **Default markers de Leaflet con asset digests.** Sprockets cambia los nombres; hay que setear `L.Icon.Default.imagePath` correctamente o crear un `divIcon` para evitar el problema.

---

## Decisiones cerradas (preguntas resueltas)

1. **Marker "you are here"** → `divIcon` con CSS `animation: pulse`. Más ligero que un SVG por marker.
2. **Refresh periódico del nearby** → no para demo, apuntado en `future.md`.
3. **Visibility chips en compose** → `public` seleccionado, `friends`/`whisper` mostrados disabled con badge SOON.
4. **Demo data** → 6 notas en EPSEVG (Vilanova) + 2 en Plaça Reial + 1 en Campus Nord. Lo elijo yo, no urgente.
5. **JSON contract** → simplificado: server emite `time_left_seconds` y `views_remaining` (no `expires_at`/`max_views` raw).
6. **Leaflet** → self-hosted en `vendor/`, no CDN.
7. **Compose** → form completo + controller con stub-success; TODO marcado y `next-steps.md` apunta la integración.
8. **Detail** → invoca `view!` ya, stub es no-op.
9. **Denied state** → inline en `/map`, sin redirect (Opción A).
