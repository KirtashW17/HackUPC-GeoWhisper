# Next steps — backlog operativo

> Tareas pequeñas pendientes que han surgido durante el trabajo, no asignadas
> a una fase concreta del MVP. Se vacían al hacerlas; lo que es post-MVP se
> mueve a [`future.md`](future.md).

## Diseño (pendiente de Claude Design)

- [X] **Mockup de estados de error en formularios** — recibido vía `prototype/screens-2.jsx :: AuthField` (borde 1.5px error-ink, halo box-shadow, label rojo, mensaje `role="alert"` debajo con SVG `!`). Implementado en el helper `auth_field`. Documentado en [`frontend.md`](frontend.md).
- [ ] **Decidir entre dos approaches de error en signup** — actualmente conviven:
  - **Top-of-form alert pill** con la lista de `@user.errors.full_messages` en una card `error-halo`.
  - **Inline per-field** (helper `auth_field`): borde rojo + halo + mensaje debajo con role="alert".
  Hay que elegir uno. *Inline* es lo del prototipo y mejor a11y por proximidad; *top alert* da overview de varios errores a la vez. Posibilidad de combinar (top alert con conteo "3 fields need attention" + inline en cada campo). Decisión pendiente con Claude Design o validación en demo.
- [ ] **UI del locale switcher en `/profile`** — pendiente; aún no diseñada. Se hará cuando exista la pantalla de profile (Fase 2+).

## Técnico

- [ ] **Backfill de docstrings YARD** en el código ya escrito en Fase 0 (`User`, `Session`, `Current`, `Authentication` concern, `RegistrationsController`, `SessionsController`, `WelcomeController`, `MapController`, `LocalesController`, `FormsHelper`). La regla nueva en `CLAUDE.md` exige YARD en todo lo nuevo; lo existente se backfilla opportunistically cuando se toque.
- [X] **Integrar `NotesController#create` con el modelo `Note`** — hecho en `phase_2_note_integration.md`. El controller usa `Note.active.nearby`, `Note.active.find_by`, `Note.create!`. ComposeForm alineado con el enum (`public_note/private_note/friends_only`).
- [X] **Borrar `Notes::Catalog` stub** — `app/models/notes/{stub,catalog}.rb` y `test/models/notes/catalog_test.rb` eliminados.
- [ ] **Configurar `i18n-tasks`** — gem ya instalada. Falta `config/i18n-tasks.yml` con paths de las locales y los `data` para detectar uso. Sustituir el test casero `I18nParityTest` por `bin/i18n-tasks health` en CI.
- [ ] **Programación periódica de `Notes::ArchiveExpiredJob`** — el job ya existe (`app/jobs/notes/archive_expired_job.rb`) pero no se dispara solo. Cuando entre SolidQueue se añadirá un `recurring.yml`; mientras tanto se puede invocar a mano (`bin/rails runner "Notes::ArchiveExpiredJob.perform_now"`) o vía cron de sistema. Decidir cadencia (probable: cada 5–10 min).
- [ ] **Verificar pipeline CI** — tras añadir auth, i18n y Tailwind, asegurarse de que los 4 jobs siguen verdes (`brakeman`, `importmap audit`, `rubocop`, `tests`).
- [X] **HTTPS para testing en móvil** — flujo de `localhost.run` documentado en [`README.md`](../README.md) ("Probar la app desde un dispositivo móvil"). Setup más permanente con `mkcert` + Puma TLS sigue como nice-to-have post-hackathon.

## Geolocalización post-onboarding (cabos sueltos del flujo de permisos)

Estado actual: durante el onboarding, denegar la ubicación marca al usuario como onboardeado igualmente y lo manda a `/map`. El servidor recibe un hidden `geolocation_denied=1` que **se descarta**. La pantalla `/map` es un placeholder, así que no se nota la diferencia.

- [ ] **Implementar el "denied state" de `/map`** (Fase 2) — pantalla del prototipo (`prototype/screens-1.jsx`, frame Denied) con instrucciones para reactivar la ubicación en el navegador, botón "Try again" que re-dispara `navigator.geolocation.getCurrentPosition`, y enlace secundario "browse a sample" (greyed). Vive como estado inline del `/map`, no como ruta aparte.
- [ ] **Re-comprobar permisos al entrar al mapa** — un Stimulus controller en `/map` que llama a `navigator.permissions.query({ name: "geolocation" })` (o intenta `getCurrentPosition` y atrapa el error). Si la respuesta es `denied`/`prompt`:
  - Opción A (más simple): mostrar el denied-state inline en `/map`.
  - Opción B (la que pide el usuario): redirigir de vuelta a `/welcome` para forzar repetir el flujo. Implica desonboardear (`onboarded_at = nil`) o aceptar que `/welcome` permita re-entrar aunque ya esté onboardeado.
  - **Decisión pendiente**: A vs B. A es menos invasivo; B es más explícito. Probable: A, con un CTA secundario "go back to onboarding" para los casos persistentes.
- [ ] **Aprovechar el flag `geolocation_denied`** que ya viaja en el POST a `/welcome` — al menos para una flash informativa la primera vez ("You can still browse, but turn on location to see whispers nearby"). En i18n.
