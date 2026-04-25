# GeoWhisper — Planificación de tareas

> Lista plana de fases y sub-tareas con su estado de implementación.
> El **porqué** de cada decisión vive en [`decisions.md`](decisions.md).
> Lo **post-MVP** vive en [`future.md`](future.md). El **backlog operativo
> de cabos sueltos** en [`next-steps.md`](next-steps.md). Los **planes
> detallados de cada tanda** en [`plans/`](plans/).

---

## Fase 0 — Fundamentos *(completada)*

> Auth, i18n, capa visual base con Tailwind + tokens del prototipo, login,
> signup, onboarding y dispatcher post-login.
> Detalle en [`plans/phase_0_auth_i18n_ci.md`](plans/phase_0_auth_i18n_ci.md)
> y [`plans/phase_1_ui_login_onboarding.md`](plans/phase_1_ui_login_onboarding.md).

### Auth

- [X] Migración `CreateUsers` (`email`, `password_digest`, `language`, `null: false`, `default: "en"`)
- [X] Migración `CreateSessions` (`user:references`, `ip_address`, `user_agent`)
- [X] Migración `AddOnboardedAtToUsers` (`onboarded_at:datetime`, nullable)
- [X] Modelo `User` (`has_secure_password`, `normalizes :email`, validaciones, `SUPPORTED_LANGUAGES`)
- [X] Modelo `Session` con `belongs_to :user`
- [X] `Current` (`ActiveSupport::CurrentAttributes`)
- [X] `Authentication` concern (resume_session, require_authentication, start_new_session_for, terminate_session, post_authentication_url)
- [X] `RegistrationsController` (signup) + auto-set `language` desde `I18n.locale`
- [X] `SessionsController` (new/create/destroy) + redirect a dispatcher si ya autenticado
- [X] `WelcomeController` (#show + #complete; setea `onboarded_at`)
- [X] `MapController#show` placeholder (redirige a /welcome si no onboarded)
- [X] `LocalesController#update` (sesión + persistencia en User)
- [X] Routes: `root "sessions#new"`, `/welcome` GET+POST, `/map` GET, recursos auth
- [X] Tests: `UserTest`, `SessionsControllerTest`, `RegistrationsControllerTest`, `LocalesControllerTest`, `PostLoginDispatchTest`

### i18n

- [X] `config.i18n.available_locales = %i[en es ca]`, default `:en`, fallbacks `[:en]`
- [X] `config/locales/{en,es,ca}.yml` con paridad
- [X] `ApplicationController#set_locale` con prioridad param > user > session > Accept-Language > default
- [X] `LocaleResolutionTest` (6 casos)
- [X] `I18nParityTest` casero (sustituible por `bin/i18n-tasks health` — pendiente en `next-steps.md`)

### UI base

- [X] `tailwindcss-rails` 3.x con tokens del prototipo (paleta Soft & Paper, fuentes Newsreader / Inter / JetBrains Mono / Caveat)
- [X] Layout responsive (`max-w-md mx-auto`) con viewport meta y theme-color
- [X] Vista `sessions/new` (login) replicando `screens-2.jsx` AuthScreen
- [X] Vista `registrations/new` (signup) — mismo wrapper, headline "A name to *sign* your whispers"
- [X] Vista `welcome/show` (onboarding) replicando `screens-1.jsx` con ghosts SVG, headline italic, tres bullets, CTA terracota
- [X] Vista `map/show` placeholder con logout
- [X] PWA manifest dinámico (i18n) con favicon kit `monogram-g`

### Frontend interactivity

- [X] importmap-rails + Stimulus instalados
- [X] `geolocation_controller.js` (dispara `getCurrentPosition` antes de submit; marca `denied`)

### Seeds

- [X] Tres usuarios demo idempotentes (`alice@example.com`/en, `ana@example.com`/es, `anna@example.com`/ca, password `ghost123`)

### Calidad

- [X] `bin/rails test` — 39/39 verdes
- [X] `bin/rubocop` — sin offenses
- [X] `bin/brakeman` — sin alertas accionables
- [X] CI workflow `.github/workflows/ci.yml` con 4 jobs (Brakeman, importmap audit, RuboCop, tests)

### Pendientes menores (no bloquean cierre de fase)

- [ ] Configurar `i18n-tasks` y sustituir `I18nParityTest` por `bin/i18n-tasks health` *(en `next-steps.md`)*
- [ ] Capturas formales en 3 viewports (375 / 768 / 1280) *(smoke test manual ya hecho)*

---

## Fase 1 — Modelo `Note`

- [X] Migración `CreateNotes` (`content:text`, `latitude:decimal`, `longitude:decimal`, `expires_at:datetime` *nullable*, `max_views:integer` *nullable*, `views_count:integer default: 0`, `user:references`, `visibility:integer` enum, `language:string` con índice)
- [X] Índice compuesto `(latitude, longitude)` para acelerar bounding box
- [X] Modelo `Note` con `belongs_to :user`, enum `visibility`
- [X] Validaciones: presence (`content`, coords, user), rangos lat/lng, `content.length` 1..500, `expires_at > created_at` si presente, `max_views >= 1` si presente *(sin cap superior a nivel de modelo)*
- [X] Scope `active`: `where("expires_at IS NULL OR expires_at > ?", Time.current).where("max_views IS NULL OR views_count < max_views")` *(con TODO sobre redundancia futura tras job de purga)*
- [X] Método `view!` que incrementa `views_count` atómicamente; mata la nota si `max_views` presente y alcanzado
- [X] Tests: validaciones, scope `active`, `view!`, expiración por tiempo, expiración por views, **caso permanente (`nil/nil`) que persiste indefinidamente**
- [X] Seeds: notas geolocalizadas demo atadas a los usuarios existentes (Plaça Reial, EPSEVG, etc.)

---

## Fase 2 — Captura de geolocalización + creación de notas

- [ ] Stimulus controller que rellena lat/lng en un form de creación
- [ ] `NotesController#new` + `#create` con form mobile-first
- [ ] UX: pedir permiso de ubicación con feedback claro si se deniega (i18n)
- [ ] Inputs flexibles para TTL (numérico + unidad) y `max_views` con caps de UI (≤ 30 días, ≤ 1000)
- [ ] Auto-asignar `Note#language` desde `I18n.locale` actual; permitir override
- [ ] Tests de controlador (creación válida, validaciones, rango de TTL/views, asignación de idioma)

---

## Fase 3 — Descubrir notas cercanas

- [ ] `NotesController#nearby` con params `lat`, `lng`, `radius`
- [ ] Query: bounding box + Haversine, scope `active`, ordenar por distancia
- [ ] Hard cap del radio: ≤ 5 km en MVP (param que el cliente no puede superar)
- [ ] Vista listado mobile-first (cards con distancia, tiempo restante, vistas restantes, idioma)
- [ ] Tests del query: nota expirada, fuera de radio, radio sobre el cap

---

## Fase 4 — Mapa interactivo

- [ ] Importar Leaflet vía importmap o como asset
- [ ] Stimulus `map_controller.js` que centra en la ubicación del usuario
- [ ] Renderizar markers de notas activas con popup de preview
- [ ] Botón "ver" que abre el detalle (consume una visualización)
- [ ] Marker especial para "tú estás aquí"
- [ ] **Denied state** en `/map` cuando se deniega geolocalización *(ver `next-steps.md`)*

---

## Fase 5 — Visualización y expiración

- [ ] `NotesController#show` que llama a `note.view!` y renderiza
- [ ] Si `view!` deja la nota muerta → mostrar contenido pero marcar "this note has just vanished" (i18n)
- [ ] Job recurrente (SolidQueue cuando entre, o Active Job programado) que purga `Note.where("expires_at < ? OR views_count >= max_views", Time.current)`
- [ ] Tests del job + tests de expiración por tiempo y por views

---

## Fase 6 — Pulido UI/UX

- [ ] Empty states ("No ghosts nearby — drop the first one") en los 3 idiomas
- [ ] Animaciones de fade al desaparecer una nota
- [ ] Iconografía coherente (Heroicons o el set hairline del prototipo)
- [ ] Loading states (al pedir geolocation, al guardar, al cargar mapa)
- [ ] Mensajes de error amables (permiso denegado, sin GPS, etc.) i18n
- [ ] PWA: añadir al home screen, offline básico
- [ ] Mockup de errores de formulario (Claude Design) integrado *(ver `next-steps.md`)*

---

## Fuera del MVP

Stretch goals (Fase 7: amigos, reacciones, imagen, OAuth), admin panel,
puntos de interés, sistema de moderación, despliegue robusto e i18n
avanzado están en [`future.md`](future.md).
