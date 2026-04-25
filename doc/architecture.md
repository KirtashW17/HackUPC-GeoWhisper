# GeoWhisper — Arquitectura (vista de alto nivel)

> Visión rápida de cómo encajan las piezas. Para el **porqué** de cada elección
> mira [`decisions.md`](decisions.md). Para el **plan operativo de qué falta**
> mira [`task_planning.md`](task_planning.md).

---

## En una frase

GeoWhisper es una app web Rails 7.2 + Hotwire + SQLite que ancla mensajes
de texto a coordenadas físicas, los muestra a quien pasa cerca, y los hace
desaparecer por tiempo o por número de lecturas. Es **mobile-first**, funciona
sin app nativa gracias a la Geolocation API del navegador, y la UI es **PWA-ready**.

---

## Diagrama (mental) del request

```
                ┌─────────────────────────┐
   Browser ◄──► │  Rails 7.2 + Hotwire    │ ◄──► SQLite
   (mobile)     │                         │      (single file)
                │  ┌───────────────────┐  │
                │  │  Controllers      │  │
                │  │  Models / scopes  │  │
                │  │  Views (ERB)      │  │
                │  │  Stimulus JS      │  │
                │  └───────────────────┘  │
                └─────────────────────────┘
                            │
                            └──► OSM tile servers
                                 (Leaflet, no API key)
```

- **Sin API JSON pública** en el MVP. El cliente y el servidor se hablan por HTML + Turbo. Stimulus añade interactividad puntual (geolocalización, mapa).
- **Sin servicios externos** salvo Google Fonts (CDN) y los tiles de OpenStreetMap.
- **Sin Redis, sin SolidQueue de momento.** Active Job con backend default. Cuando llegue la purga periódica de notas se introduce SolidQueue.

---

## Capas

### 1. Vistas (HTML server-rendered + Tailwind + Hotwire)

- ERB en `app/views/`. Layout único `application.html.erb`, mobile-first, contenido centrado en `max-w-md` para que en pantallas grandes la app se vea como un *device frame* sutil.
- **Tokens de diseño** vienen del prototipo (`prototype/HANDOFF.md`): paleta Soft & Paper (paper bg `#f5efe4`, terracota accent `#b6552c`), familias serif `Newsreader` / sans `Inter` / mono `JetBrains Mono` / handwriting `Caveat`.
- **No hay JS framework propio.** Hotwire (Turbo) maneja navegación; Stimulus maneja interacciones puntuales (`geolocation_controller.js`, futuro `map_controller.js`).
- **i18n**: todos los textos pasan por `t("…")` con paridad obligatoria entre `en`, `es`, `ca`.

### 2. Controllers

Todos heredan de `ApplicationController`, que `include Authentication` (concern propio) y aplica `before_action :set_locale`. Concerns relevantes:

- **`Authentication`** (`app/controllers/concerns/authentication.rb`):
  - `resume_session` — corre antes de todo; si hay cookie `signed[:session_id]` válida, popula `Current.session`.
  - `require_authentication` — corre después; redirige a `/` si no hay session.
  - `allow_unauthenticated_access` — método de clase que salta `require_authentication` para acciones públicas (login, signup, root).
  - `start_new_session_for(user)` — crea fila `Session`, firma cookie httponly + same_site lax.
  - `terminate_session` — destruye fila + borra cookie.
  - `post_authentication_url` — dispatcher: `welcome_url` si `!user.onboarded_at`, `map_url` en caso contrario.

Endpoints actuales:

| Verbo | Ruta | Controller#action | Auth | Notas |
|---|---|---|---|---|
| GET | `/` | `sessions#new` | público (redirige si auth) | Login (root) |
| POST | `/session` | `sessions#create` | público | Login |
| DELETE | `/session` | `sessions#destroy` | auth | Logout |
| GET | `/registration/new` | `registrations#new` | público | Signup form |
| POST | `/registration` | `registrations#create` | público | Auto-set `language: I18n.locale` |
| GET | `/welcome` | `welcome#show` | auth | Redirige a `/map` si onboarded |
| POST | `/welcome` | `welcome#complete` | auth | Setea `onboarded_at`, redirige a `/map` |
| GET | `/map` | `map#show` | auth | Redirige a `/welcome` si no onboarded |
| PATCH | `/locale` | `locales#update` | público | Cambia idioma sesión + user |
| GET | `/up` | `rails/health#show` | público | Healthcheck |

### 3. Modelos (ActiveRecord)

```
User ─< Session
User ─< Note (futuro)
Note ─ language  (futuro)
Note ─ visibility (futuro: enum public/friends/whisper)
Note ─ user_id, lat, lng, expires_at, max_views, views_count
```

Estado actual:

- **`User`** — `email` (único, normalizado), `password_digest` (`has_secure_password`), `language` (`%w[en es ca]`), `onboarded_at` (`datetime`, nullable). `has_many :sessions, dependent: :destroy`.
- **`Session`** — `belongs_to :user`, `ip_address`, `user_agent`. La cookie firmada del cliente solo lleva el `session.id`; revocar = borrar fila.
- **`Current`** — `ActiveSupport::CurrentAttributes` con `:session` y delegación `:user`. Resetea por request.

Próximamente:

- **`Note`** — el modelo central. Detalle en `task_planning.md` Fase 1 y `decisions.md`. Puntos clave:
  - `expires_at` y `max_views` **nullable** — `nil` = sin restricción.
  - Scope `active` filtra notas vivas considerando `nil` como "infinito".
  - `view!` incrementa `views_count` atómicamente y mata la nota si `max_views` está presente y alcanzado.
  - `language` indexada para futuro filtrado por preferencias.
  - Índice compuesto `(latitude, longitude)` para bounding box.

### 4. Front-end interactivo (Stimulus)

- **`geolocation_controller.js`** — usado en el onboarding. Intercepta el submit del form, llama a `navigator.geolocation.getCurrentPosition`. En cualquier resultado (granted o denied) submite el form; cuando denegado, marca un hidden field `geolocation_denied=1` para que el server pueda reaccionar.
- **`map_controller.js`** *(futuro, Fase 4)* — inicializa Leaflet, dibuja markers de notas activas, gestiona el "denied state".

---

## Datos: cómo se almacenan y consultan

### Storage

- **SQLite** (`db/development.sqlite3`). Migraciones en `db/migrate/`. Schema en `db/schema.rb`.
- **Sin extensiones espaciales** (no PostGIS). Las queries geo se hacen en SQL plano.

### Consulta "notas cercanas" (futuro)

```sql
-- Pseudo-SQL del futuro Note.nearby(lat, lng, radius_km)
SELECT *,
       acos(sin(:lat_r) * sin(radians(latitude))
          + cos(:lat_r) * cos(radians(latitude))
                       * cos(radians(longitude) - :lng_r)) * 6371 AS distance_km
FROM notes
WHERE latitude  BETWEEN :lat - :delta AND :lat + :delta   -- bounding box
  AND longitude BETWEEN :lng - :delta AND :lng + :delta
  AND (expires_at IS NULL OR expires_at > :now)
  AND (max_views IS NULL OR views_count < max_views)
HAVING distance_km <= :radius
ORDER BY distance_km ASC
```

- El bounding box hace de filtro grueso (índice usable).
- El Haversine en `HAVING` filtra el círculo real y ordena.
- El radio está topado en 5 km por el controlador (no por el modelo).

### Expiración

Doble defensa:

1. **Lazy** (siempre): el scope `active` esconde notas expiradas o agotadas en cualquier consulta.
2. **Eager** (Fase 5): un `RecurringJob` purga las que quedan obsoletas para no acumular basura.

---

## Autenticación y sesiones

- **Stack:** `bcrypt` + `has_secure_password` + tabla `sessions` + cookie firmada (`httponly`, `same_site: :lax`).
- **No es JWT, no es Devise.** Es el patrón del generador de Rails 8 reimplementado a mano para Rails 7.2 (ver `decisions.md`).
- **Revocación:** borrar la fila `Session`; la cookie deja de validar al instante.
- **Locale del usuario** persiste en `users.language`; un visitante usa `session[:locale]` o el header `Accept-Language`.

---

## Geolocation y privacidad

- **Captura**: 100% en el cliente con `navigator.geolocation`. Necesita *secure context* — `localhost` OK, en otros hosts requiere HTTPS.
- **Persistencia**: NO guardamos historiales de ubicación. Solo se almacena la coordenada de la nota en el momento en que el usuario la deja.
- **Permisos**: el `onboarded_at` del usuario significa "completó el flujo de bienvenida". El permiso de geolocation real puede revocarse en el navegador en cualquier momento; el `/map` (cuando exista) tendrá que detectarlo y mostrar un "denied state".

---

## i18n y traducción

- **Tres locales desde el día 1**: `en`, `es`, `ca`. Paridad obligatoria.
- **Resolución por request**: `params[:locale]` > `Current.user.language` > `session[:locale]` > `Accept-Language` > default `:en`. Implementado en `ApplicationController#set_locale`.
- **Texto fuente** se escribe en inglés y se traduce. Validación con `I18nParityTest` (sustituible por `bin/i18n-tasks health` cuando se configure).
- **Notas multi-idioma** (futuro): `Note#language` ya planificada con índice; filtrado por preferencias de usuario y traducción automática (DeepL/OpenAI) van a futuras fases.

---

## Calidad y herramientas

- **Tests**: MiniTest, sin Capybara/Selenium. Modelo + controlador + integración (`ActionDispatch::IntegrationTest`).
- **Lint**: `rubocop-rails-omakase`, no warnings.
- **Seguridad estática**: `brakeman` sin alertas accionables.
- **CI**: GitHub Actions con 4 jobs (`brakeman`, `importmap audit`, `rubocop`, `tests`).
- **TDD obligatorio**: rojo → verde → refactor en cada feature.

---

## Despliegue (futuro)

No incluido en el MVP. Cuando entre, candidato natural: **Kamal** o **Fly.io**, con HTTPS automático (necesario fuera de `localhost` para que el navegador entregue coordenadas). El `Dockerfile` que vino con el scaffold ya está; falta `config/deploy.yml` y secretos.

---

## Convenciones internas

- Cada cambio no trivial empieza con un plan en `doc/plans/<nombre>.md`.
- Cada decisión se registra en [`decisions.md`](decisions.md).
- Las pantallas nuevas miran primero `prototype/screens-*.jsx` y `prototype/HANDOFF.md`.
- Sin estilos inline (`style="…"`); todo a través de Tailwind utility classes con los tokens del proyecto.
- Las mensajes flash y todo el copy van por i18n.

---

## Mapa de directorios relevantes

```
app/
  assets/
    images/logos/{ghost-pin,ink-pin,monogram-g}/   ← favicon kits del prototipo
    stylesheets/
      application.css                              ← legacy manifest
      application.tailwind.css                     ← input para Tailwind build
    builds/tailwind.css                            ← output, generado, gitignored
  controllers/
    concerns/authentication.rb
    application_controller.rb                      ← include Authentication, set_locale
    sessions_controller.rb                         ← root + login + logout
    registrations_controller.rb                    ← signup
    welcome_controller.rb                          ← onboarding show + complete
    map_controller.rb                              ← placeholder, Fase 4 lo llena
    locales_controller.rb                          ← cambio de idioma
  javascript/
    application.js
    controllers/
      application.js                               ← Stimulus app
      geolocation_controller.js                    ← prompt nav.geolocation
      index.js                                     ← eagerLoadControllersFrom
  models/
    user.rb       session.rb       current.rb
  views/
    layouts/application.html.erb                   ← shell mobile-first
    sessions/new.html.erb                          ← login (prototipo screens-2)
    registrations/new.html.erb                     ← signup
    welcome/show.html.erb                          ← onboarding (screens-1)
    map/show.html.erb                              ← placeholder Fase 4
    pwa/manifest.json.erb                          ← PWA manifest dinámico
config/
  routes.rb         tailwind.config.js
  locales/{en,es,ca}.yml
db/
  migrate/{users,sessions,onboarded_at}.rb
  schema.rb         seeds.rb
doc/
  inception.md      architecture.md (este)
  decisions.md      task_planning.md
  future.md         next-steps.md
  plans/phase_*.md
prototype/                                          ← ground-truth visual
test/
  controllers/   integration/   models/   lib/   fixtures/
```
