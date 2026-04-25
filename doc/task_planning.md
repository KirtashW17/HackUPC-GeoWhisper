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

## Fase 2 — Captura de geolocalización + creación de notas *(completada)*

> Detalle en [`plans/phase_2_map_and_compose.md`](plans/phase_2_map_and_compose.md) y [`plans/phase_2_note_integration.md`](plans/phase_2_note_integration.md).

- [X] `geolocation_controller.js` rellena lat/lng en el form (autofill on connect)
- [X] `NotesController#new` + `#create` con form mobile-first (`Notes::ComposeForm` + `Note.create!`)
- [X] UX: prompt de ubicación; denied state con Try Again en `/map`
- [X] Inputs flexibles para TTL (15min/1h/1día/1semana) y `max_views` (1/5/25/100) con caps (≤ 30 días, ≤ 1000) en form-side
- [X] Auto-asignar `language` desde `I18n.locale`; chip selectable
- [X] Tests del controller (`NotesControllerTest` — auth/onboarded gate, JSON contract, create válido/inválido)

---

## Fase 3 — Descubrir notas cercanas *(completada)*

- [X] `NotesController#nearby` con params `lat`, `lng`, `radius`
- [X] `Note.nearby`: bounding box + Haversine en Ruby, scope `active`, ordenar por distancia
- [X] Hard cap del radio: ≤ 5 km en MVP (`Note::MAX_RADIUS_M`, server-side)
- [X] Vista listado dentro del `/map` (toggle Map ↔ List, mismas tarjetas WhisperCard)
- [X] Tests del query (`NoteTest`: nota expirada, fuera de radio, radio sobre el cap, permanente, unlimited views)

---

## Fase 4 — Mapa interactivo *(completada)*

- [X] Leaflet 1.9.4 self-hosted en `vendor/javascript/leaflet.js` + CSS
- [X] Stimulus `map_controller.js` con state machine (`loading→ready/empty/denied`) y geolocation
- [X] Markers de notas activas (divIcon terracota); peek card de la más cercana
- [X] Click en marker abre `/notes/:id` (incrementa `view!`)
- [X] Marker "tú estás aquí" con `divIcon` + animación pulse
- [X] **Denied state** inline en `/map` con instrucciones + Try Again
- [X] Skin Soft & Paper en tiles (CSS filter) + popups + atribución
- [ ] Radio configurable por el usuario *(en `future.md` como nice-to-have)*

---

## Fase 4 bis — Clustering del mapa *(completada)*

> Agrupar pins que caen a < 40 px en pantalla en un *stack de papelitos* +
> bottom sheet. Resolver el solapamiento con el pin "You are here" con un
> badge esquinero. Detalle en
> [`plans/phase_3_clustering.md`](plans/phase_3_clustering.md). Optimización
> y reverse geocoding aplazados a [`future.md`](future.md).

- [X] CSS `.gw-pin-cluster` (3 capas + corner-fold + count + anchor dot, sm/lg) y `.gw-pin-here__badge`
- [X] CSS `.gw-cluster-sheet`, `.gw-cluster-overlay`, `.gw-cluster-sheet__close` con animación `gw-slide-up` (220 ms) + `gw-fade-in` (180 ms)
- [X] Vista `/map` con targets nuevos (`overlay`, `sheet`, `sheetEyebrow`, `sheetList`, `closePill`) y claves i18n del cluster en el `data-map-i18n-value`
- [X] `map_controller.js`: `clusterize()` greedy O(n²) con threshold `CLUSTER_THRESHOLD_PX = 40`, separa here-cluster del resto, ancla cada grupo en su primera nota
- [X] Re-cluster en `zoomend` / `moveend`
- [X] Singles → `gw-pin` (navegan a `/notes/:id`); clusters ≥ 2 → `gw-pin-cluster` (abren sheet)
- [X] Here-cluster: badge esquinero sobre `gw-pin-here` con contador (`N`, `9+`, `99+`); tap abre sheet con eyebrow `Right where you stand`
- [X] Bottom sheet open/close: tap en row navega; cierre via overlay, pill `Close stack` o tecla `Escape`
- [X] Peek inteligente: si la nota más cercana cae en un cluster, el peek se sustituye por `N whispers · Xm` y abre el sheet en lugar de navegar
- [X] i18n: `map.cluster.{eyebrow.{one,other},here_eyebrow,distance_away,close,peek.{one,other}}` en en/es/ca con paridad
- [X] Test de integración (`MapControllerTest`) que verifica la presencia de los nuevos targets y de las claves i18n del cluster en el HTML
- [X] `bin/rails test` 126/126 verde, `bin/rubocop` limpio, `bin/brakeman` sin alertas accionables

---

## Fase 5 — Visualización y expiración

- [ ] `NotesController#show` que llama a `note.view!` y renderiza
- [ ] Si `view!` deja la nota muerta → mostrar contenido pero marcar "this note has just vanished" (i18n)
- [X] Job (`Notes::ArchiveExpiredJob`) que archiva (`archived = true`) las notas con `expires_at < now` o `views_count >= max_views` — programación periódica pendiente (ver `doc/next-steps.md`)
- [X] Tests del job + tests de expiración por tiempo y por views

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

## Fase 7 — Yourself (perfil) + archivado *(completada)*

> Pantalla de perfil replicando `prototype/profile-with-signout.jsx`
> (`SettingsScreen`, eyebrow + título "Yourself", tarjeta de identidad,
> secciones LANGUAGES / PRESENCE / YOUR TRAIL, frase manuscrita al pie),
> archivado de notas propias y cierre de sesión. Detalle en
> [`plans/phase_7_yourself_and_archive.md`](plans/phase_7_yourself_and_archive.md).
>
> El trail incluye **toda** la historia del usuario (vivas, archivadas y
> expiradas) — sólo `Note.active` excluye archivadas/expiradas, no la
> consulta del trail. Decisión documentada en el plan (D-7).

### Pantalla `/yourself`

- [X] Ruta `GET /yourself` → `YourselfController#show`, gateado por auth + onboarded
- [X] Vista mobile-first replicando `SettingsScreen` (header con eyebrow `@<usuario>`, tarjeta de identidad con avatar-monograma + nombre + contador, secciones LANGUAGES / PRESENCE / YOUR TRAIL, frase `be quiet, be here.` al pie)
- [X] Tarjeta de identidad: avatar circular con la inicial del email, contador `N lanzadas · M vivas` (donde *vivas* = `user.notes.active.count`)
- [X] Sección LANGUAGES: row "Show whispers in" deshabilitada (badge `SOON`); row "Interface" con chip group EN/ES/CA que envía PATCH a `/locale` reusando `LocalesController#update`
- [X] Sección PRESENCE: row "Search radius" **deshabilitada** con badge `SOON` (placeholder `1 km`); rows "Notify me when nearby" y "Anonymous mode" deshabilitadas
- [X] Sección YOUR TRAIL: todas las notas del usuario ordenadas por `created_at desc`, con dot terracota si vivas / inkFaint atenuado si archivadas/expiradas, meta-line `<distancia? · alive · X/Y reads>`, `archived · X/Y reads` o `vanished N days ago`
- [X] Tap en cualquier row del trail navega a `/notes/:id` (con `lat`/`lng` del visor si existen)
- [X] Logout: botón al pie con `button_to DELETE /session`, estilo destructivo suave
- [X] Tab bar: slot `me` enlazado a `/yourself` (sin badge SOON), marcado activo cuando estamos en la pantalla

### Archivado de notas propias

- [X] `NotesController#show`: si `current_user == note.user`, sustituye el botón "Report" por **Archive** con `data-turbo-confirm`
- [X] `NotesController#destroy` (`DELETE /notes/:id`) → `note.archive!`, redirige a `/map` con flash `t("detail.archive.success")`
- [X] Autorización: 404 si `current_user != note.user` (no se filtra existencia de notas ajenas)
- [X] `Note.active` filtra `archived: false` (bug latente arreglado): nota archivada queda fuera de `/notes/nearby` y de su propio `/notes/:id`
- [X] Tests del controller: ruta, autorización, efecto en `nearby`, idempotencia

### i18n

- [X] Claves nuevas `yourself.*` y `detail.archive.*` en `config/locales/{en,es,ca}.yml` con paridad
- [X] `I18nParityTest` verde

### Tests

- [X] `YourselfControllerTest` (14 casos) — auth/onboarded gate, render, contadores correctos, trail con archivadas+expiradas+vivas, orden `created_at desc`, distancia condicionada a coords del visor, sign-out form, search radius con SOON, chip group de idiomas, empty state
- [X] `NotesControllerTest` — botón Archive visible solo al dueño, `#destroy` ok / 404 / 401, efecto en `nearby` y en `show`, archivadas devuelven 404 en show
- [X] `bin/rails test` 164/164 verde · `bin/rubocop` limpio · `bin/brakeman` sin alertas nuevas

### Plan detallado

- [X] [`doc/plans/phase_7_yourself_and_archive.md`](plans/phase_7_yourself_and_archive.md) escrito con todas las decisiones (naming del contador, markup del trail row sin distancia, UX del logout sin modal, empty state, reuso de `LocalesController`, autorización 404 vs 403, fix del scope `Note.active`)

---

## Fuera del MVP

Stretch goals (Fase 7: amigos, reacciones, imagen, OAuth), admin panel,
puntos de interés, sistema de moderación, despliegue robusto e i18n
avanzado están en [`future.md`](future.md).
