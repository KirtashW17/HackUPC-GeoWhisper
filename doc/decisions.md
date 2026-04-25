# GeoWhisper — Decision log

> Documento vivo. Recoge las decisiones técnicas y de organización del
> proyecto con su motivación, sus alternativas evaluadas y, cuando aplique,
> el plan de salida si la decisión tuviera que revertirse.
>
> El plan operativo de tareas vive en [`task_planning.md`](task_planning.md).
> Las cosas fuera del MVP están en [`future.md`](future.md).

---

## Restricciones transversales (aplican a TODAS las fases)

Reglas no negociables. También están en [`README.md`](../README.md) y [`CLAUDE.md`](../CLAUDE.md).

- **TDD obligatorio** — red → green → refactor. Antes de cualquier código de producción debe existir un test que falle. Aplica a modelos, controladores, jobs y flujos de integración.
- **RuboCop sin warnings + Brakeman sin alertas nuevas** antes de cualquier commit/merge.
- **i18n para todo texto visible** — nada de strings hardcodeadas en vistas, controladores, mailers ni flashes. Paridad de claves entre `en.yml`, `es.yml`, `ca.yml`.
- **Plan before implementing** — todo cambio no trivial empieza con un plan en `doc/plans/<nombre>.md`. Las decisiones del plan se acuerdan antes de codear.
- **Sin tests de Capybara / sistema** — solo modelo, controlador e integración (`ActionDispatch::IntegrationTest`).
- **Sin estilos inline** — nada de `style="..."` en vistas; todo a través del stylesheet/Tailwind.

---

## Stack

### Rails 7.2 (no upgrade a 8) — *aceptado*

- **Decisión:** quedarnos en el scaffold inicial de Rails 7.2.3.1 sobre Ruby 3.1.2.
- **Motivación:** Rails 8 exige Ruby 3.2+ y refactor de Sprockets→Propshaft, además de `app:update` interactivo. Evaluado en 1–2h de fontanería con riesgo de regresiones — coste no asumible en hackathon.
- **Coste asumido:** sin generador nativo de auth, sin SolidQueue/SolidCache de serie, sin Propshaft.
- **Plan de salida:** documentado como migración natural si el proyecto sobrevive al hackathon.

### Autenticación: `has_secure_password` hand-rolled (sin Devise) — *aceptado*

- **Decisión:** auth manual con `bcrypt` + `has_secure_password`, modelo `Session` persistente + cookie firmada con `session.id`.
- **Motivación:** replicar la forma del generador de Rails 8 (sesiones revocables) en ~150 líneas, sin gem extra ni magia oculta. Devise estaba descartado por peso (confirmable, lockable, OmniAuth) que no necesitamos en MVP.
- **Alternativas:** Devise (peso excesivo); generador nativo de Rails 8 (descartado al no upgrademos).
- **Implementación:** `app/controllers/concerns/authentication.rb` con `resume_session` separado de `require_authentication`; `Current` (`ActiveSupport::CurrentAttributes`); cookie `signed`, `httponly`, `same_site: :lax`.

### CSS: Tailwind v3 sin DaisyUI — *aceptado*

- **Decisión:** `tailwindcss-rails` 3.x (binary standalone, sin Node) con tokens custom del prototipo. **No** DaisyUI.
- **Motivación:** el prototipo está hecho con tokens propios y componentes a medida; ninguna pantalla usa patrones DaisyUI. Añadirlo solo para sobreescribirlo no aporta.
- **Reevaluable:** si llegan formularios densos donde DaisyUI sí ahorre código, se considera.

### Mapa: Leaflet 1.9 + OpenStreetMap — *aceptado*

- **Decisión:** Leaflet con tiles de OSM, sin API key.
- **Motivación:** gratis, mobile-friendly, fácil con Stimulus, viable para la demo.
- **Alternativa:** MapLibre GL con vector tiles (más bonito pero requiere proveedor con API key — más fricción).
- **Plan de salida:** si OSM se satura en demo, pasamos a Stadia Maps free tier.

### Jobs: Active Job default — *aceptado (provisional)*

- **Decisión:** Active Job con backend por defecto. SolidQueue se añadirá si llegamos a la purga periódica de notas (Fase 5).
- **Motivación:** SolidQueue es default de Rails 8; en 7.2 hay que añadirlo como gem. No bloquea hasta Fase 5.

### Base de datos: SQLite — *aceptado*

- **Decisión:** SQLite tanto en dev como en MVP.
- **Motivación:** cero setup, Rails 7.2 lo trata como production-capable, suficiente para el volumen de la demo (decenas de notas/usuarios). Bounding box + Haversine en SQL va sobrado.
- **Alternativas:** PostgreSQL + PostGIS (técnicamente correcto con `ST_DWithin` indexado, pero coste de setup); MySQL (sin ventaja).
- **Plan de salida:** si las queries de `nearby` se sienten lentas con seed denso, migración a Postgres + PostGIS documentada como camino corto.

---

## i18n

### Locales soportados: `en` + `es` + `ca` — *aceptado*

- **Decisión:** los tres desde el día 1.
- **Motivación:** público de HackUPC mixto Barcelona-internacional.
- **Resolución de locale (orden):** `params[:locale]` > `Current.user.language` > `session[:locale]` > `Accept-Language` > default `en`.
- **Texto fuente:** se escribe en inglés y se traduce a `es`/`ca` con paridad obligatoria.

### `User#language` (no `User#preferred_languages`) — *aceptado*

- **Decisión simplificada para MVP:** una sola lengua por usuario, que es el idioma de la UI.
- **Motivación:** acordado "1 usuario 1 idioma" en la primera tanda; el array `preferred_languages` para filtrar notas se pospuso. Migración trivial cuando llegue.
- **Auto-detección al signup:** `language: I18n.locale.to_s` en el momento del registro.

### Locale switcher: solo en `/profile` (futuro) — *aceptado*

- **Decisión:** no mostrar el selector de idioma en login/signup/onboarding. Vivirá en `/profile` cuando esa pantalla exista.
- **Motivación:** las pantallas auth quedan más limpias; la detección por `Accept-Language` cubre al visitante.

### Traducción automática — *fuera del MVP, modelo preparado*

- Cuando se conecte una API de traducción (DeepL, Google, OpenAI), se añadirá `translated_content` cacheado por destino sin tocar `content` original.

---

## Modelo `Note`

### Notas eternas vía UI: NO — *aceptado*

- **Decisión:** TTL y `max_views` con caps duros desde la UI (≤ 30 días, ≤ 1000 vistas). El usuario puede escribir cualquier valor dentro de rango.
- **Motivación:** la ephemeralidad es el diferencial. Notas eternas diluirían el producto en "Twitter geolocalizado" y abrirían riesgos de moderación.

### Notas permanentes a nivel de modelo: `nil` mejor que `0` — *aceptado*

- **Decisión:** `expires_at` y `max_views` son nullable. `nil` significa "sin restricción". UI del MVP no expone esa opción, pero el substrato queda.
- **Motivación:** semántica clara (nil = ausencia de límite vs `0` = "expira de inmediato"); convención SQL/Rails; queries y validaciones más limpias.
- **Validación:** sin cap superior a nivel de modelo (los caps de 30 días / 1000 vistas son de UI/controlador).
- **Test obligatorio:** `Note.create!(expires_at: nil, max_views: nil, ...)` permanece en `active` indefinidamente.
- **No sustituye al futuro `Landmark`** — `Landmark` será un tipo editorial (POI, info histórica) con UI propia. Las notas permanentes vía `nil/nil` son el sustrato técnico que permite ambos caminos sin migración adicional.

### Expiración por tiempo *o* por vistas — *aceptado*

- Una nota muere por **lo que se cumpla primero**.
- **Doble defensa:** scope `active` filtra al consultar y un job periódico (cuando llegue) purgará. Ambas capas deben mantenerse en sync.

---

## Flujo de usuario

### Login es la ruta raíz; dispatcher post-login — *aceptado*

| Estado | Destino al hit `/` |
|---|---|
| No autenticado | `SessionsController#new` (login) |
| Autenticado, **sin** `onboarded_at` | redirige a `/welcome` |
| Autenticado **con** `onboarded_at` | redirige a `/map` |

- **Implementación:** `users.onboarded_at` (`datetime`, nullable) + `post_authentication_url` en el `Authentication` concern. `WelcomeController#complete` setea `onboarded_at = Time.current` y manda al `/map`.
- **Limitación reconocida:** "GPS concedido" no se persiste (vive en el navegador y puede revocarse). `onboarded_at` representa "el usuario completó el flujo", no "tiene GPS ahora". El "denied state" en el mapa se diseña para Fase 2.

### Geolocation en el CTA del onboarding — *aceptado*

- **Decisión:** `navigator.geolocation.getCurrentPosition` desde Stimulus controller, en cualquier resultado (concedido o denegado) se hace `POST /welcome` y se sigue el flujo. El flag `geolocation_denied` viaja como hidden field.

### Sin handle / sin chip selector multi-idioma — *aceptado*

- **Decisión:** signup pide solo email + password. Nada de `@handle` ni "I read whispers in".
- **Motivación:** mantener la fricción mínima; simpler is better. Handle se traslada a `future.md` como "perfil público".

---

## Diseño y assets

### Prototipo como ground-truth visual — *aceptado*

- **Decisión:** cada pantalla nueva consulta `prototype/screens-*.jsx` y `prototype/HANDOFF.md` antes de escribir markup.
- **Motivación:** evitar inventar UI que luego haya que rehacer; mantener consistencia con la paleta y tipografía acordadas.

### Favicon: kit `monogram-g` — *aceptado*

- **Decisión:** usar el kit `app/assets/images/logos/monogram-g/` para favicon e iconos PWA.
- **Alternativas evaluadas:** `ghost-pin` (descartado por estética muy oscura), `ink-pin`.

### Tipografías: Newsreader / Inter / JetBrains Mono / Caveat — *aceptado*

- **Decisión:** cargar desde Google Fonts vía `<link>` con `display=swap` en `application.html.erb`. No autohospedamos.
- **Riesgo asumido:** dependemos del CDN de Google en demo offline. Plan B: embeber en local si surge problema.

### Errores de formulario: pendiente de mockup — *abierto*

- **Estado actual:** lista simple bajo el campo afectado en color `accent`.
- **Pendiente:** mockup que producirá Claude Design ([`next-steps.md`](next-steps.md)).

---

## Calidad y herramientas

### `i18n-tasks` instalado, configuración pendiente — *abierto*

- Gem añadida al `Gemfile`. Falta `config/i18n-tasks.yml` y sustituir `I18nParityTest` casero por `bin/i18n-tasks health`. Apuntado en [`next-steps.md`](next-steps.md).

### Sin Capybara / system tests — *aceptado*

- **Decisión:** prohibido `Capybara`, `selenium-webdriver`, `ApplicationSystemTestCase`, `visit`, `click_on`, `fill_in`. Se cubre con tests de modelo + controlador + integración.
- **Motivación:** los system tests con Selenium son lentos, frágiles, y aportan poco para el alcance del MVP. Documentado en [`CLAUDE.md`](../CLAUDE.md).

### Smoke tests manuales: a cargo del usuario — *aceptado*

- El asistente no levanta el server (`bin/rails s`/`bin/dev`) ni hace `curl` a la app. La cobertura va por test suite; los browser checks los hace el usuario.
