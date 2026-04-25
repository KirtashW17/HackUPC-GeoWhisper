# GeoWhisper — Front-end guidelines

> Cómo se estructura la capa visual e interactiva. Para el **porqué** de las
> decisiones de stack visual mira [`decisions.md`](decisions.md). Para el
> mapping entre prototipo y rutas Rails mira
> [`../prototype/HANDOFF.md`](../prototype/HANDOFF.md).

---

## Stack

- **Tailwind CSS v3** (sin DaisyUI) vía `tailwindcss-rails` 3.x — binary standalone, sin Node ni npm.
- **Hotwire (Turbo + Stimulus)** — Turbo gestiona navegación, Stimulus añade interacciones puntuales.
- **importmap-rails** — sin bundler, los módulos se sirven directamente.
- **Google Fonts** (Newsreader / Inter / JetBrains Mono / Caveat) cargadas vía `<link>` con `display=swap`.

## Tokens del proyecto

Definidos en `config/tailwind.config.js`. Todos vienen del HANDOFF del prototipo (Soft & Paper):

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#f5efe4` | Fondo de página (paper) |
| `bg-deep` | `#ede5d4` | Superficies inset, separadores |
| `card` | `#fffaf0` | Tarjetas, inputs |
| `card-edge` | `rgba(60,40,20,0.08)` | Borde de cards |
| `ink` | `#2a2118` | Texto primario |
| `ink-soft` | `rgba(42,33,24,0.62)` | Texto secundario, metadata |
| `ink-faint` | `rgba(42,33,24,0.32)` | Disabled, dividers |
| `accent` | `#b6552c` | CTAs, links, "live" markers |
| `accent-soft` | `#e8c8a8` | Tape, highlight |
| `ghost` | `#7a8b7a` | "You are here" pin, glyphs |
| `error-ink` | `#c0432b` | Error border, label, helper text |
| `error-halo` | `rgba(192,67,43,0.20)` | Soft glow alrededor de inputs con error |

Familias de fuente: `font-serif` (Newsreader), `font-sans` (Inter), `font-mono` (JetBrains Mono), `font-hand` (Caveat — usar con cuentagotas).

Radii custom: `rounded-card` (14px), `rounded-sheet` (16px), `rounded-hero` (18px), `rounded-button` (14px).

Sombras custom: `shadow-card`, `shadow-hero`, `shadow-cta`.

## Reglas

- **No estilos inline** (`style="…"`). Si una utilidad falta, añadir clase a `tailwind.config.js` o usar arbitrary values (`h-[52px]`).
- **Mobile-first responsive.** Wrapper estándar: `<div class="mx-auto flex min-h-screen max-w-md flex-col bg-bg">`. En desktop la app queda centrada como un *device frame* sutil; no hay rediseño.
- **Sin DaisyUI.** Componentes a medida. Reevaluamos si llegan formularios densos.
- **Todo texto pasa por i18n.** Nada de strings hardcodeadas en vistas.
- **Tokens en lugar de hex.** Si pillas un `#b6552c` hardcodeado en una vista, rómpelo y usa `text-accent`.

---

## Form errors

### Patrón visual

Replicado de `prototype/screens-2.jsx :: AuthField`.

- **Borde** del input: `border-[1.5px] border-error-ink` (vs `border border-card-edge` en estado normal). El medio píxel mantiene el grid alineado y se nota a primera vista.
- **Halo** suave alrededor del input: `shadow-[0_0_0_3px_theme(colors.error-halo)]` (transición `transition-shadow duration-150`).
- **Label** del input pasa de `text-ink-soft` a `text-error-ink`.
- **Mensaje de error** debajo del input, con `role="alert"`, SVG `!` glyph, sans 12 medium en `text-error-ink`.
- **a11y**: `aria-invalid="true"` + `aria-describedby="<field-id>-error"` cuando hay error.

### Approach Rails: helper `auth_field` + `field_error_proc` neutralizado

Decisión: helper explícito en lugar de monkey-patching de un `FormBuilder` global o uso del `<div class="field_with_errors">` por defecto.

**Por qué:**

- **`field_error_proc` por defecto** envuelve `<input>` y `<label>` con un `<div class="field_with_errors">`. Ese wrapper rompe la card de Tailwind (mete un div entre el form y el input estilizado, rompe el border-radius). **Lo neutralizamos** en `config/initializers/field_error_proc.rb` para que el helper sea el único responsable de pintar el error.
- **Custom `FormBuilder`** sería válido, pero esconde la lógica detrás de magia y fuerza adoptarlo en cada `form_with`. El helper se invoca explícitamente y es trivial de leer.
- **Helper** mantiene el control de cuándo y dónde aparece el error, y permite un alert pill aparte para errores form-wide (login: "Wrong email or password").

**Cómo se usa:**

```erb
<%= form_with model: @user, url: registration_path, local: true do |f| %>
  <%= auth_form_alert(flash[:alert]) %>

  <%= auth_field(f, :email,
        label: t("auth.fields.email"),
        type:  :email,
        autocomplete: "email",
        autofocus: true) %>

  <%= auth_field(f, :password,
        label: t("auth.fields.password"),
        type:  :password,
        autocomplete: "new-password") %>

  <%= f.submit t("auth.signup.submit"), class: "..." %>
<% end %>
```

**Variantes:**

- **`auth_field(form, attribute, label:, type:, autocomplete:, autofocus:)`** — un input. Lee `form.object.errors[attribute]` para decidir si pintar el estado de error. Funciona también con `form_with url: ...` (sin modelo): `form.object` es nil, no hay errores nunca, render normal.
- **`auth_form_alert(message)`** — alerta arriba del form para mensajes form-wide (login fallido, etc.). Devuelve `nil` si `message` es blank.

### Approach actual: solo inline per-field

Para errores de validación (signup) usamos **únicamente** la versión inline del helper `auth_field`. El top-of-form aggregate queda **comentado** en `registrations/new.html.erb` por si decidimos volver a él (ver [`next-steps.md`](next-steps.md)).

### Color de los alerts form-wide

`auth_form_alert` (login fallido, mensajes de sistema dentro del form) usa el palette **`accent`** (terracota) — son mensajes advisorios, no errores de validación. Los errores de validación per-field sí usan la familia más roja (`error-ink`). Esta diferenciación cromática evita que un toast "wrong password" parezca el mismo nivel de severidad que un campo en rojo. El propio helper documenta el alternativo `error-ink` por si en algún momento se quiere unificar.

---

## Stimulus controllers

Viven en `app/javascript/controllers/`. Naming convention: `<name>_controller.js`. Auto-registrados via `eagerLoadControllersFrom("controllers", application)` en `app/javascript/controllers/index.js`.

### Activos

- **`geolocation_controller.js`** — usado en el form de onboarding (`welcome/show`). Intercepta el click del CTA, dispara `navigator.geolocation.getCurrentPosition`, y en cualquier resultado submite el form. Marca un hidden field `geolocation_denied` cuando el navegador rechaza/falla. Targets: `form`, `denied`. Action: `click->geolocation#request`.

### Convenciones

- Un controller hace una cosa. Si crece, separar.
- Targets en `static targets = [...]`. Acciones en `data-action`.
- No tocar el DOM fuera del scope del controller.
- Si necesitas una constante de configuración (timeout, etc.) ponla en `static values` o como propiedad `default*` del controller — no la hardcodees en el método.

---

## Layout y responsive

Layout único en `app/views/layouts/application.html.erb`:

- `<html lang="<%= I18n.locale %>">`
- `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`
- `<meta name="theme-color" content="#f5efe4">` (paper bg para la chrome del navegador móvil)
- Google Fonts con `preconnect` + `display=swap`
- Favicon kit: `app/assets/images/logos/monogram-g/` (canónico en el repo, byte-idéntico al kit del prototipo)
- PWA manifest dinámico en `app/views/pwa/manifest.json.erb` con i18n para `name`/`description`
- Body: `min-h-screen bg-bg text-ink font-serif antialiased`

Cada pantalla envuelve su contenido en:

```erb
<div class="mx-auto flex min-h-screen max-w-md flex-col bg-bg">
  ...
</div>
```

Esto da la experiencia mobile-native en mobile y un *device frame* centrado en pantallas grandes sin esfuerzo.

---

## Prototipo como ground-truth

Antes de escribir markup nuevo:

1. Mira el frame correspondiente en `prototype/screens-*.jsx` y `prototype/atoms.jsx`.
2. Lee el README/HANDOFF del prototipo para tokens y patterns.
3. Traduce los estilos inline JSX a clases Tailwind con los tokens del proyecto.

El prototipo se sirve estático con `npx serve prototype` (ver `prototype/README.md`).

---

## Lo que **no** hay (todavía)

- DaisyUI — descartado.
- Tema oscuro — el prototipo tiene `Twilight` como variante, pero el MVP solo usa `Soft & Paper`.
- Iconografía propia — usamos SVG inline o Heroicons cuando hagan falta. Sin spritesheet.
- Skeleton/loading — pendiente para Fase 6.
- Animaciones complejas — el ink-bleed vanish del detalle de nota está en el prototipo pero se traduce a un fade simple en el MVP.
