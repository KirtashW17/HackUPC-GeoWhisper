# Plan — Fase 0 · sub-plan B: Login + Signup + Onboarding (con prototipo)

> **Sub-plan B de la Fase 0 ("Fundamentos") en
> [`task_planning.md`](../task_planning.md).** Cubre la capa visual base
> (Tailwind + tokens del prototipo), las pantallas de login/signup, el
> onboarding con Stimulus geolocation y el dispatcher post-login.
> *(El nombre del fichero `phase_1_*` es histórico: lo escribimos pensando
> que sería Fase 1 antes de reordenar; lo conservamos para no romper
> enlaces.)*
>
> **Estado: completado al 100%** salvo capturas formales en 3 viewports
> (smoke test manual confirmado por el usuario en navegador).
>
> **Sub-plan A de la misma fase**:
> [`phase_0_auth_i18n_ci.md`](phase_0_auth_i18n_ci.md). Las decisiones
> técnicas y motivaciones viven en [`../decisions.md`](../decisions.md).

---

## Resumen de entrega

- [X] Tailwind v3 (`tailwindcss-rails` 3.x) con tokens del prototipo + Google Fonts
- [X] Migración `onboarded_at` + dispatcher `post_authentication_url`
- [X] Routes: `root "sessions#new"`, `/welcome` GET+POST, `/map` GET; `HomeController` borrado
- [X] `WelcomeController` (#show + #complete) y `MapController` placeholder
- [X] Vistas `sessions/new`, `registrations/new`, `welcome/show`, `map/show` siguiendo el prototipo
- [X] Stimulus + importmap; `geolocation_controller.js`
- [X] PWA manifest con favicon `monogram-g`, theme color `#f5efe4`
- [X] Seeds idempotentes (3 usuarios, uno por idioma)
- [X] Tests de integración: `PostLoginDispatchTest` (10 casos) — 39/39 verdes total
- [X] RuboCop limpio, Brakeman sin alertas accionables
- [X] Locale switcher diferido a `/profile` (no en pantallas auth)

---

## Estado actual

- Auth backend funciona (29 tests verdes), pero las vistas son ERB plano sin estilos.
- No hay Tailwind instalado todavía.
- `prototype/HANDOFF.md` documenta tokens, tipografías y mapping a rutas.
- `prototype/README.md` ya creado para correrlo con `npx serve`.

---

## Decisiones técnicas

### 1. Tailwind sin DaisyUI

El prototipo está hecho con tokens propios y componentes a medida; ninguna pantalla usa patrones DaisyUI. Añadir DaisyUI solo para sobreescribirlo no aporta. Vamos solo con `tailwindcss-rails` (binary standalone, sin Node). Reevaluamos si llegan formularios densos donde Daisy sí ayude.

### 2. Routing y dispatcher de post-login

**Login es la ruta raíz.** Despacho según estado del usuario:

| Estado | Destino |
|---|---|
| No autenticado | `/` → **login** (`SessionsController#new`). |
| Autenticado, **sin** `onboarded_at` | `/` → `/welcome` (onboarding). |
| Autenticado **con** `onboarded_at` | `/` → `/map` (vista mapa — placeholder en esta fase). |

**Implicación de modelo:** añadir `users.onboarded_at` (`datetime`, nullable). Se setea cuando el usuario completa el onboarding.

**Limitación sobre "GPS concedido":** el permiso de geolocalización vive en el navegador y puede revocarse en cualquier momento. No es fiable persistirlo en servidor. Por eso `onboarded_at` representa "el usuario ha completado el flujo", no "tiene GPS activo ahora". Si al llegar al `/map` el navegador deniega geolocation, mostraremos el "denied state" (Fase 2, ya previsto en `screens-1.jsx`).

**Routes finales:**

```ruby
root "sessions#new"

resource :registration, only: %i[new create]
resource :session,      only: %i[new create destroy]
resource :locale,       only: :update

get  "/welcome", to: "welcome#show",     as: :welcome
post "/welcome", to: "welcome#complete", as: :complete_onboarding
get  "/map",     to: "map#show",         as: :map
```

**Reglas de redirect:**
- `SessionsController#new` (root): si **ya** autenticado, redirige al dispatcher.
- `WelcomeController#show`: requiere auth; si ya hay `onboarded_at`, redirige a `/map`.
- `WelcomeController#complete`: requiere auth; setea `onboarded_at = Time.current`; redirige a `/map`.
- `MapController#show`: requiere auth; si **no** hay `onboarded_at`, redirige a `/welcome`.
- `RegistrationsController#create`: tras crear user+session, redirige al dispatcher (irá a `/welcome`).

**Helper en `Authentication` concern:**

```ruby
def post_authentication_url
  return welcome_url unless Current.user.onboarded_at
  map_url
end
```

`after_authentication_url` lo usa por defecto cuando no hay `return_to`.

### 3. Responsive mobile-first

- **Mobile** (default, < 768px): diseño nativo del prototipo, ancho 100%, padding lateral.
- **Tablet/desktop**: contenido centrado en columna `max-w-md` (~430px). La app es conceptualmente móvil; en pantallas grandes queda centrada como un *device frame* sutil. Fondo `bg` ocupa el viewport completo.
- Wrapper estándar de pantalla: `max-w-md mx-auto min-h-screen` en `<main>`. Tailwind se encarga.
- No hay breakpoint adicional; un solo punto (mobile vs centrado).

### 4. Onboarding antes o después de signup

Antes era una pregunta abierta; con el routing decidido en (2) **queda claro**: signup ocurre primero (form en `/registration/new`), y al crear cuenta el dispatcher manda al usuario a `/welcome`. Onboarding es una pantalla post-signup, **no** una landing pública.

Por tanto el botón principal del onboarding ya no dice "comenzar / signup", sino algo como "Comenzar" / "Vamos" → `POST /welcome` → setea `onboarded_at` → llega a `/map`.

### 5. Sin `handle` (`@marina`)

El prototipo lo muestra. **NO** lo añadimos en esta tanda — auth solo necesita email + password. Va a `future.md` como "perfil público / handles".

### 6. Sin selector multi-idioma "I read whispers in"

Acordado "1 usuario 1 idioma" en la fase actual. Omitimos el chip selector. El idioma se infiere del locale activo al hacer signup; se cambia desde `/profile` (futuro).

### 7. Botón "Continue with Google" disabled SOON

Lo dejamos visible y disabled como en el prototipo, con badge `SOON`. Refuerza el diseño y comunica el roadmap. Coste cero.

### 8. Tipografías

Newsreader (serif), Inter (sans), JetBrains Mono (mono), Caveat (handwriting) — todas Google Fonts. Las cargamos vía `<link rel="stylesheet">` con `display=swap` en `application.html.erb`. No autohospedamos (decisión de hackathon).

### 9. Geolocalización en el CTA del onboarding (sí, ya)

El navegador expone `navigator.geolocation.getCurrentPosition` directamente; no hace falta nada nativo ni componentes especiales de Turbo. Lo metemos en esta tanda con un Stimulus controller mínimo.

**Flujo del CTA "Allow location & begin":**

1. Click en el botón → Stimulus controller `geolocation` intercepta el submit del form.
2. Llama a `navigator.geolocation.getCurrentPosition(success, denied, opts)`.
3. **Success**: el form se envía a `POST /welcome`. (Las coordenadas no las persistimos en este sprint — el navegador volverá a pedirlas al llegar al mapa, gracias a la *cached permission*; cuando el usuario haya concedido, no vuelve a salir el prompt.)
4. **Denied / error**: el form se envía igualmente a `POST /welcome` con un flag `geolocation_denied=true`. El usuario queda onboardeado pero sin permisos; al llegar a `/map` le mostraremos el "denied state" (Fase 2).
5. **Sin JS**: el form sigue funcionando como `<form method="post">` plano; si JS está desactivado, simplemente se setea `onboarded_at` sin disparar prompt.

**Stimulus controller `geolocation_controller.js` (esqueleto):**

```js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form", "denied"]

  request(event) {
    event.preventDefault()
    if (!navigator.geolocation) {
      this.submit(true) // denied path
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => this.submit(false),
      () => this.submit(true),
      { timeout: 10000, maximumAge: 0 }
    )
  }

  submit(denied) {
    if (denied) this.deniedTarget.value = "1"
    this.formTarget.requestSubmit()
  }
}
```

**Copy del CTA**: ahora sí "Allow location & begin" / "Permitir ubicación y empezar" / "Permet la ubicació i comença".

---

## Pasos de implementación

### A. Setup Tailwind y app-shell

1. Añadir `gem "tailwindcss-rails"` al Gemfile.
2. `bin/rails tailwindcss:install` — genera `app/assets/stylesheets/application.tailwind.css` y `tailwind.config.js`.
3. Sustituir `tailwind.config.js` con la paleta del prototipo (`bg`, `bg-deep`, `card`, `card-edge`, `ink`, `ink-soft`, `ink-faint`, `accent`, `accent-soft`, `ghost`) + custom font families.
4. Añadir Google Fonts (Newsreader, Inter, JetBrains Mono, Caveat) en `application.html.erb`.
5. Verificar que `bin/dev` corre el watcher (foreman + Procfile.dev del template de tailwindcss-rails).
6. Smoke test: una página renderiza fondo `bg` y tipografía serif.

### B. Migración `onboarded_at` y dispatcher

7. Migration `AddOnboardedAtToUsers` (`add_column :users, :onboarded_at, :datetime`).
8. Tests rojos: `UserTest` para nuevo campo (default nil), `AuthenticationConcernTest` para `post_authentication_url`.
9. Implementar `post_authentication_url` en `Authentication` concern.
10. Cambiar `after_authentication_url` para que use `post_authentication_url` cuando no haya `return_to`.
11. Tests rojos: integración del flujo (signup → welcome; login user onboardeado → map; login user no onboardeado → welcome).
12. Implementar redirects en cada controller.
13. Verde.

### C. Routes y controllers placeholder

14. Cambiar `root "home#index"` → `root "sessions#new"`. Borrar `HomeController`.
15. Crear `WelcomeController` con `#show` y `#complete`.
16. Crear `MapController` con `#show` (placeholder ERB con texto "Map coming soon" + locale switcher; suficiente hasta Fase 2).
17. `SessionsController#new` redirige al dispatcher si `authenticated?`.
18. Tests de cada controller (autorización, redirects, state transitions).

### D. Vista Login (`sessions/new`)

19. Aplicar tokens del prototipo: monograma "g.", eyebrow mono, headline serif con palabra en italic terracotta, campos `AuthField` (label mono mini sobre input transparente).
20. Botón "Continue with Google" disabled con badge SOON.
21. CTA terracotta "Sign in".
22. Footer "New here? Make an account" → `/registration/new`.
23. Background sutil (gradient `bg → bg-deep` vertical; el "fade map" del prototipo lo dejamos para más adelante cuando haya Leaflet).
24. Mensajes de error: pill terracotta arriba del form (estilo igual que flash).
25. Claves i18n nuevas (en/es/ca): `auth.login.eyebrow`, `auth.login.headline.{prefix,emphasis,suffix}`, `auth.login.submit`, `auth.divider_or`, `auth.google_continue`, `auth.soon`, `auth.login.no_account`, `auth.login.create_link`.

### E. Vista Signup (`registrations/new`)

26. Mismo wrapper que login.
27. Headline distinta ("A name to *sign* your whispers").
28. Email + password + password_confirmation. **Sin** handle, **sin** chip selector.
29. Botón Google SOON, CTA terracotta ("Begin").
30. Footer "Already have a name? Sign in".
31. Claves i18n análogas a login.

### F. Vista Onboarding (`welcome/show`) + Stimulus geolocation

32. Replicar onboarding del prototipo: ghosts decorativos (SVG inline), eyebrow mono, headline serif con énfasis italic, subhead, tres bullets ("Anchored / Ephemeral / Quiet").
33. Form `<form method="post" action="/welcome" data-controller="geolocation" data-geolocation-target="form">` con un hidden field `geolocation_denied` (target `denied`).
34. CTA terracotta `data-action="click->geolocation#request"`. Disparar `navigator.geolocation.getCurrentPosition`; en cualquier resultado, submitir el form.
35. Legal mono pequeñito ("WE NEVER STORE WHERE YOU'VE BEEN" o equivalente).
36. Crear `app/javascript/controllers/geolocation_controller.js` con la lógica del esqueleto (decisión 9).
37. `WelcomeController#complete` setea `onboarded_at` siempre; opcionalmente puede leer `params[:geolocation_denied]` para una flash informativa, pero en MVP basta con marcar onboarded.
38. Tests:
    - Unit del controller: POST /welcome marca `onboarded_at`.
    - Test de integración (`ActionDispatch::IntegrationTest`) cubriendo el envío plano del form sin JS.
    - El path "JS dispara geolocation y luego envía" no se testea automáticamente (sin Capybara/Selenium); el Stimulus controller queda cubierto por revisión manual y, si se requiere, un test JS unitario más adelante.
39. Claves i18n: `onboarding.eyebrow`, `onboarding.headline.{prefix,emphasis}`, `onboarding.subhead`, `onboarding.bullets.{anchored,ephemeral,quiet}.{title,body}`, `onboarding.cta`, `onboarding.legal`.

### G. Locale switcher

**No** lo mostramos en login/signup/onboarding. Vivirá únicamente en `/profile` (futuro). Para esta tanda, simplemente quitamos el `_locale_switcher` del `home/index` actual cuando rehagamos las pantallas. La detección de locale sigue funcionando vía `Accept-Language` header y `User#language` para autenticados.

### H. Tests

37. Tests de integración (`ActionDispatch::IntegrationTest`, sin Capybara):
    - `OnboardingFlowTest`: POST /registration → assert redirect a /welcome → POST /welcome → assert redirect a /map y `onboarded_at` set.
    - `LoginFlowTest_NewUser`: usuario sin `onboarded_at` → POST /session → assert redirect a /welcome.
    - `LoginFlowTest_ReturningUser`: usuario con `onboarded_at` → POST /session → assert redirect a /map.
    - `RootDispatcherTest`: cada estado va al destino correcto.
38. Verificar tests existentes siguen verdes.

### I. Pulido

39. `bin/rubocop -a`.
40. `bin/brakeman --no-pager`.
41. `bin/i18n-tasks health` (cuando esté configurado).
42. Capturas en tres viewports (375px, 768px, 1280px) para revisar el responsive.

---

## Lo que NO se toca en esta tanda

- Mapa real con Leaflet y prompt de geolocalización (Fase 2).
- Bottom nav app-shell (Fase 2, cuando haya pantallas autenticadas múltiples).
- DaisyUI (decisión 1).
- `handle` y selector multi-idioma (decisiones 5 y 6).
- Página `/profile` con cambio de idioma persistente desde la app-shell (Fase 2+).
- "Fade map" de fondo en login (queda para cuando Leaflet exista; ahora gradient).

---

## Riesgos

- **`bin/dev` con watcher de Tailwind:** si el watcher no arranca, las clases no compilan. Documentar en README.
- **Fuentes Google:** dependemos del CDN de Google Fonts; en demo offline puede fallar. Aceptado para hackathon.
- **Solapo con Claude Design (otra instancia):** acordar que esta tanda toca `application.html.erb`, `application.tailwind.css`, `tailwind.config.js`, y las vistas concretas (`sessions/new`, `registrations/new`, `welcome/show`, `map/show`). Otras instancias evitan esos archivos.

---

## Preguntas resueltas

1. **Locale switcher en pantallas auth** → no, solo en `/profile` (futuro).
2. **Estilo de errores en formularios** → pendiente del mockup que hará Claude Design. Apuntado en [`next-steps.md`](../next-steps.md). Mientras tanto, fallback temporal: lista simple bajo el campo afectado (texto color `accent`, sin pill especial).
3. **Geolocation en el CTA del onboarding** → sí, ya en esta tanda, vía `navigator.geolocation` + Stimulus controller (decisión 9). Copy: "Allow location & begin".
