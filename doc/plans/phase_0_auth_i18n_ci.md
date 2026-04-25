# Plan — Fase 0 (parcial): Auth + i18n + CI

> **Alcance acordado:** auth, esqueleto i18n y CI básico. La capa visual
> (Tailwind + DaisyUI + layout mobile-first) la genera Claude Design en
> paralelo y se integrará después.
>
> **Simplificación de scope para esta tanda:**
> - 1 usuario → 1 idioma. El idioma del usuario es **el idioma de la UI**.
> - Las notasrail(cuando existan) se mostrarán **todas**, sin filtrar por idioma.
> - **Sin** auto-traducción.
> - Esto deprecia temporalmente `User#preferred_languages` (array) → se sustituye por `User#language` (string). Cuando volvamos al filtrado multi-idioma, migramos.

---

## Estado actual del scaffold

- **Rails 7.2.3** (no 8). Por tanto auth manual con `has_secure_password`, no `bin/rails generate authentication`.
- **CI ya existe** en `.github/workflows/ci.yml` con 4 jobs: Brakeman, importmap audit, RuboCop, tests + tests:system. **No hace falta crearlo, solo verificar que pasa verde con el código nuevo.**
- `application_controller.rb` mínimo, sin concerns. Routes vacío salvo health/PWA.
- No hay gem de auth (ni Devise ni bcrypt activo). Hay que descomentar `bcrypt` en el Gemfile.

---

## 1. Autenticación (Rails 7.2 + has_secure_password)

Replicamos la forma del generador de Rails 8 — sessions persistentes en la BD con cookie firmada que guarda el `session.id`. Ventajas: revocable (borrar la fila), sin libraries extra.

### 1.1. Gemfile

- Descomentar `gem "bcrypt", "~> 3.1.7"`.
- `bundle install`.

### 1.2. Modelo `User`

Migración `CreateUsers`:

```ruby
create_table :users do |t|
  t.string :email, null: false
  t.string :password_digest, null: false
  t.string :language, null: false, default: "en"
  t.timestamps
end
add_index :users, :email, unique: true
```

Modelo `app/models/user.rb`:

```ruby
class User < ApplicationRecord
  SUPPORTED_LANGUAGES = %w[en es ca].freeze

  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :email, with: ->(e) { e.strip.downcase }

  validates :email, presence: true, uniqueness: true,
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :language, presence: true, inclusion: { in: SUPPORTED_LANGUAGES }
end
```

### 1.3. Modelo `Session`

Migración `CreateSessions`:

```ruby
create_table :sessions do |t|
  t.references :user, null: false, foreign_key: true
  t.string :ip_address
  t.string :user_agent
  t.timestamps
end
```

Modelo:

```ruby
class Session < ApplicationRecord
  belongs_to :user
end
```

### 1.4. `Authentication` concern

`app/controllers/concerns/authentication.rb`:

- `before_action :require_authentication` (saltable con `allow_unauthenticated_access`).
- `Current.session = ...`, `Current.user = session.user`.
- `helper_method :authenticated?, :current_user`.
- `start_new_session_for(user)` — crea fila Session, firma cookie `session_id` (signed, httponly, same_site: :lax).
- `terminate_session` — destruye Session y borra cookie.
- `after_authentication_url` — donde redirigir tras login (default: root).

### 1.5. `Current` (ActiveSupport::CurrentAttributes)

`app/models/current.rb`:

```ruby
class Current < ActiveSupport::CurrentAttributes
  attribute :session
  delegate :user, to: :session, allow_nil: true
end
```

### 1.6. Controllers

- `RegistrationsController` (`new`, `create`) → asigna `language: I18n.locale.to_s` antes de guardar (auto-detección desde el locale activo); tras crear usuario llama a `start_new_session_for`.
- `SessionsController` (`new`, `create`, `destroy`).
- `ApplicationController include Authentication`.

### 1.7. Routes

```ruby
resource :registration, only: [:new, :create]
resource :session,      only: [:new, :create, :destroy]

root "home#index"  # placeholder hasta que haya Notes
```

Y un `HomeController#index` mínimo con un texto que diga si estás logueado.

### 1.8. Vistas (sin estilizar — Claude Design lo hará)

ERB plano y semántico. Sin clases Tailwind, solo estructura. Todos los textos vía `t(...)`.

### 1.9. Tests

- **`UserTest`**: validaciones (presence, formato email, language inclusión, unicidad, normalize email).
- **`SessionsControllerTest`**: login OK / login fallido / logout.
- **`RegistrationsControllerTest`**: signup válido crea User+Session, signup inválido renderiza errores.
- **`AuthenticationFlowTest` (integration)**: signup → ver root → logout → root pide login.
- Todo en MiniTest, fixtures generadas para User. Password en fixtures con `password_digest: <%= BCrypt::Password.create("secret") %>`.

---

## 2. i18n (en/es/ca)

### 2.1. Configuración

`config/application.rb`:

```ruby
config.i18n.available_locales = %i[en es ca]
config.i18n.default_locale = :en
config.i18n.fallbacks = [:en]
```

### 2.2. Ficheros de locales

- `config/locales/en.yml` — texto fuente (canónico).
- `config/locales/es.yml`, `config/locales/ca.yml` — paridad obligatoria.

Claves iniciales (ejemplo, se ampliará al meter Notes):

```yaml
en:
  app:
    name: GeoWhisper
    tagline: Ghost notes left in the world
  layout:
    sign_in: Sign in
    sign_up: Sign up
    sign_out: Sign out
  auth:
    login:
      title: Welcome back
      submit: Sign in
      invalid: Wrong email or password
    signup:
      title: Create your account
      submit: Create account
    fields:
      email: Email
      password: Password
  locale_switcher:
    label: Language
    languages:
      en: English
      es: Spanish
      ca: Catalan
  errors:
    forbidden: You need to sign in first.
```

### 2.3. `ApplicationController#set_locale`

```ruby
before_action :set_locale

def set_locale
  I18n.locale = pick_locale
end

def pick_locale
  param   = params[:locale].to_s.to_sym
  return param if I18n.available_locales.include?(param)

  return Current.user.language.to_sym if Current.user&.language

  session_loc = session[:locale]&.to_sym
  return session_loc if I18n.available_locales.include?(session_loc)

  header_loc = request.env["HTTP_ACCEPT_LANGUAGE"]&.scan(/^[a-z]{2}/)&.first&.to_sym
  return header_loc if I18n.available_locales.include?(header_loc)

  I18n.default_locale
end
```

### 2.4. Locale switcher

Una mini ruta + controller:

```ruby
# routes.rb
resource :locale, only: :update, controller: :locales
```

`LocalesController#update`:

- Recibe `params[:locale]`.
- Si está en `I18n.available_locales`:
  - `session[:locale] = params[:locale]`.
  - Si hay `Current.user`, también `current_user.update(language: params[:locale])`.
- Redirect back.

Vista parcial `_locale_switcher.html.erb` con un `<form>` y tres opciones (botones submit, no JS necesario). Se incluye en el layout cuando haya layout — por ahora puede ir en `home/index`.

### 2.5. Tests

- **`LocalesControllerTest`**: cambia el locale en sesión, persiste en User si autenticado, ignora locale no soportado.
- **`I18nTest`** (en `test/lib/`): paridad de claves entre `en.yml`, `es.yml`, `ca.yml` (recursivo). Falla si una clave existe en uno y no en otro.
- **`ApplicationControllerTest`**: prioridad param > user > session > header > default.

---

## 3. CI

El workflow ya existe (`.github/workflows/ci.yml`). Acciones:

1. **Verificar** que tras los cambios todos los jobs pasan localmente:
   - `bin/rubocop` sin warnings.
   - `bin/brakeman --no-pager` sin alertas nuevas.
   - `bin/importmap audit` sin vulnerabilidades.
   - `bin/rails db:test:prepare test` verde.
2. **No** añadir un job nuevo. Solo comprobar.

Nada más a hacer salvo que algo del código nuevo dispare alertas.

---

## Estado de ejecución (TDD)

**Auth — completado:**

- [X] Descomentar `bcrypt`, `bundle install`
- [X] Migraciones `CreateUsers` y `CreateSessions` (con `null: false` y `default: "en"` en language)
- [X] Fixtures vacías para `users` y `sessions`
- [X] `UserTest` rojo → `User` modelo (`has_secure_password`, `normalizes :email`, validaciones, `SUPPORTED_LANGUAGES`) → verde
- [X] Modelo `Session` + `Current` (ActiveSupport::CurrentAttributes)
- [X] `Authentication` concern (resume_session separado de require_authentication)
- [X] `SessionsController` (new/create/destroy)
- [X] `RegistrationsController` (new/create) con auto-asignación de `language` desde `I18n.locale`
- [X] `LocalesController` (update)
- [X] Routes: `resource :registration`, `resource :session`, `resource :locale`, root provisional `home#index`
- [X] `HomeController#index` placeholder con switcher

**i18n — completado:**

- [X] `config.i18n.available_locales = %i[en es ca]` y `default_locale = :en` y `fallbacks = [:en]`
- [X] `config/locales/en.yml`, `es.yml`, `ca.yml` con paridad de claves
- [X] `ApplicationController#set_locale` con prioridad param > user > session > Accept-Language > default
- [X] `LocalesControllerTest` (3 casos)
- [X] `LocaleResolutionTest` (6 casos cubriendo prioridades)
- [X] `I18nParityTest` casero comparando claves entre los tres locales

**Tests — verdes localmente:**

- [X] 29 tests verdes / 53 assertions (UserTest, SessionsControllerTest, RegistrationsControllerTest, LocalesControllerTest, LocaleResolutionTest, I18nParityTest)
- [X] `bin/rails test` pasa

**i18n-tasks — instalado pero sin configurar:**

- [X] Gem `i18n-tasks` añadida al `Gemfile` (development/test, `require: false`)
- [ ] Crear `config/i18n-tasks.yml`
- [ ] Sustituir `I18nParityTest` por `bin/i18n-tasks health` ejecutado desde el test suite o desde CI
- [ ] Apuntado en [`../next-steps.md`](../next-steps.md)

**Verificación CI — completado:**

- [X] `bin/rubocop` — sin offenses
- [X] `bin/brakeman --no-pager` — únicas alertas son "Ruby 3.1.2 EOL" (independiente del código) y un *Weak* HTTP Verb Confusion sobre `request.get?` en el patrón estándar de Rails (no actionable)
- [X] `bin/rails db:test:prepare test` — 39/39 verdes
- [X] Commit del trabajo de Fase 0 (`32e26e8`) y Fase 1 (pendiente de incluir el último commit con favicon + dispatcher)
- [X] CI verificable; el workflow `.github/workflows/ci.yml` corre los 4 jobs en push a `main`

---

## Lo que NO se toca en esta tanda

- Tailwind / DaisyUI / layout: paralelo Claude Design.
- Modelo `Note` y todo lo geográfico: Fase 1+ siguiente.
- `User#preferred_languages` array: pospuesto. Hoy `User#language` (string).
- Filtrado de notas por idioma del usuario: pospuesto.
- Vistas estilizadas: por ahora ERB minimal sin clases CSS.
- `omniauth`, redes sociales, password reset por email: stretch / future.

---

## Riesgos y notas

- **Vistas sin estilo intermedias:** las páginas de auth quedarán feas durante el solapo con Claude Design. Asumido. Mantener clases vacías y estructura semántica para que el rebranding visual sea trivial.
- **Cookie session:** asegurarse de que `signed` se usa correctamente y la cookie es `httponly` + `same_site: :lax`.
- **RuboCop omakase:** algunas convenciones (frozen_string_literal, comillas dobles) — autofix de RuboCop debería bastar.
- **Conflicto con Claude Design:** si su rama también toca `application.html.erb`, prevenir merge conflict acordando que esta tanda no toca el layout y solo añade vistas en su propia carpeta.

---

Sigue pendiente del plan de Fase 1:
- Pantalla de onboarding + Stimulus controller geolocation_controller.js (requiere instalar importmap).
- Migración onboarded_at + dispatcher post-login.
- Cambiar root a sessions#new.
- Tests de integración del flujo completo.