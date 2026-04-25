# Plan: convertir GeoWhisper en una PWA instalable

## Objetivo

Que el usuario pueda **instalar** GeoWhisper en su móvil ("Add to Home Screen" /
"Install app") y abrirla como app standalone, sin barra de URL del navegador.

**Fuera de alcance (de momento):** offline real, background sync, push
notifications. Ver "Futuro" al final.

## Por qué solo "instalable" y no offline

GeoWhisper es, por definición, un servicio de red:

- la query de "notas cercanas" vive en el servidor (Haversine en SQL),
- las notas expiran por TTL aplicado en BD y por un job periódico,
- la geolocalización del navegador funciona offline pero no aporta nada sin el
  endpoint que devuelve notas.

Cachear assets daría una ganancia marginal (la primera carga ya es rápida) a
cambio de una complejidad notable: invalidación con el fingerprinting de
Propshaft, coordinación con Turbo (que intercepta navegación y se enfada si el
SW sirve HTML viejo tras un deploy), y un fallback page. No vale la pena en MVP.

Por eso el plan se limita a lo que desbloquea **instalación + apariencia de
app**, que es lo que el usuario percibe.

## Estado actual (ya hecho por el scaffolding de Rails 7.2)

- `app/views/pwa/manifest.json.erb` con name, icons (192, 512, 512 maskable),
  `start_url: /`, `display: standalone`, theme/background color `#f5efe4`.
- `app/views/pwa/service-worker.js` (vacío salvo comentarios sobre push).
- `config/routes.rb` expone `/service-worker` y `/manifest` vía
  `Rails::PwaController`.
- `app/views/layouts/application.html.erb` ya incluye:
  - `<link rel="manifest" href="/manifest.json">`
  - `<meta name="theme-color" content="#f5efe4">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `apple-touch-icon`.
- Iconos PNG presentes en `app/assets/images/logos/monogram-g/`:
  `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, favicons.

## Qué falta

### 1. Casar la ruta del manifest con el `<link>` del layout

El layout linkea `/manifest.json`, pero la ruta nombrada es `/manifest` (sin
extensión). Hay que verificar:

- Opción A: cambiar el layout a `<link rel="manifest" href="<%=
  pwa_manifest_path(format: :json) %>">` y dejar la ruta tal cual (más
  rails-idiomático, evita rutas hardcoded).
- Opción B: añadir `defaults: { format: :json }` o un alias en routes para que
  `/manifest.json` también responda.

**Decisión propuesta:** opción A — usar el helper. Coherente con cómo
referenciamos otros assets.

### 2. Registrar el service worker

Hoy el SW existe en disco pero **nadie lo registra**, así que el navegador no
lo conoce y por tanto no ofrece "Install app" en la mayoría de plataformas
(Chrome y Edge exigen un SW activo; Safari iOS es más laxo pero igual lo
queremos).

Plan:

- Añadir un pequeño script al layout, después de los importmap tags, que haga
  `navigator.serviceWorker.register("/service-worker.js")` (o el path nombrado)
  con guarda `if ("serviceWorker" in navigator)`.
- Mantenerlo *fuera* del importmap: es código de bootstrap que debe correr
  aunque importmap falle, y no necesita módulos. Un `<script>` inline o un
  archivo plano servido como asset.
- **Decisión:** `<script>` inline corto en el layout, dentro de un partial
  `_pwa_register.html.erb` para mantener el layout limpio. CSP debe permitir
  `'self'` y los scripts inline ya generados (revisar
  `config/initializers/content_security_policy.rb` — si está activo, añadir
  un nonce con `csp_meta_tag`).

### 3. Añadir tests

Por la regla TDD del proyecto:

- **Test de integración** (`test/integration/pwa_test.rb`):
  - `GET /manifest.json` (o lo que decidamos) → 200, content-type JSON,
    incluye `"start_url": "/"` y al menos un icono 192 y 512.
  - `GET /service-worker.js` → 200, content-type JavaScript.
  - `GET /` → la respuesta HTML enlaza el manifest y registra el SW (assert
    sobre el HTML, sin browser).

No hace falta tocar modelos. No usar Capybara ni system tests (regla del
proyecto).

### 4. i18n del manifest

`manifest.json.erb` ya usa `t("app.name")` y `t("app.tagline")`. Verificar que
ambas claves existen en todos los locales (`config/locales/*.yml`) y que el
`description` del manifest no quede vacío para ningún idioma. Si falta, añadir.

### 5. Favicon SVG y theme color en modo oscuro

Optativo pero barato: añadir `<meta name="theme-color"
content="#2a2118" media="(prefers-color-scheme: dark)">` para que la barra de
estado del móvil case mejor cuando el usuario tenga dark mode. Solo si la app
tiene una variante oscura — si no, omitir.

### 6. Comprobaciones manuales (las hace el usuario, según la regla
   "smoke tests manuales")

Se entregan estas instrucciones para que el usuario verifique en su navegador:

1. Servir la app por HTTPS o por `localhost` (el SW exige contexto seguro).
2. DevTools → Application → Manifest: ver que sale name, icons, start_url, sin
   warnings.
3. DevTools → Application → Service Workers: ver "activated and running".
4. Lighthouse → categoría PWA / "Installable": que pase.
5. En móvil: menú del navegador → "Add to Home Screen" / "Install app" → abrir
   desde el icono y comprobar que se ve sin barra de URL.

## Pasos de implementación (orden)

1. Comprobar `config/locales/*.yml`: `app.name` y `app.tagline` presentes en
   todos los idiomas. Añadir las que falten.
2. Escribir el test de integración descrito arriba (debe fallar sobre el
   estado actual del registro del SW y posiblemente sobre la ruta del
   manifest).
3. Cambiar el `<link rel="manifest">` del layout para usar
   `pwa_manifest_path(format: :json)`.
4. Crear `app/views/layouts/_pwa_register.html.erb` con el script de registro
   y renderizarlo desde `application.html.erb`.
5. Verificar CSP: si está activa, asegurar que el script inline no la viola
   (usar nonce vía `csp_meta_tag` o externalizar el script).
6. Pasar `bin/rubocop` y `bin/brakeman`.
7. Confirmar que el test pasa.
8. Pedir al usuario que haga las comprobaciones manuales del punto 6 anterior.

## Riesgos / cosas a vigilar

- **CSP + script inline:** si el initializer de CSP no permite `unsafe-inline`
  ni nonces, el registro del SW se bloqueará silenciosamente. Es el punto más
  probable de fricción.
- **Turbo + SW:** mientras el SW no cachee respuestas HTML, no hay conflicto.
  Si en el futuro cacheamos HTML, hay que coordinar con `data-turbo-track` y
  con el ciclo de invalidación de Propshaft.
- **iOS Safari:** soporta PWA pero con limitaciones (no `beforeinstallprompt`,
  splash screens más restringidas). Aceptable para MVP.
- **Geolocalización en standalone:** el permiso es por origen, no por
  "instalación", así que la app instalada heredará lo que el usuario haya
  concedido en el navegador. Documentar en README.

## Preguntas abiertas

- ¿Queremos un splash screen específico para iOS (`apple-touch-startup-image`
  con varias resoluciones)? Coste alto en assets, ganancia visual moderada.
  **Propuesta:** no, lo dejamos para post-MVP.
- ¿Activamos `display: "standalone"` o `"minimal-ui"`? El scaffolding pone
  standalone; lo mantenemos.

## Futuro (no en este plan)

- Offline shell con Workbox cuando el producto tolere "veo cosas viejas".
- Push notifications para "alguien dejó una nota cerca de ti" (necesita VAPID
  keys, `PushSubscription` model, endpoint `/push/subscribe`, y un job que
  envíe). Justificaría su propio plan.
- Background Sync para componer una nota offline y sincronizar al volver la
  red — solo si añadimos compose offline al producto.
