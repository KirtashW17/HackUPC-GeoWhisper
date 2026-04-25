# GeoWhisper — Planificación de tareas

> Plan de implementación del MVP con decisiones cerradas tras la primera ronda
> de anotaciones. Las preguntas pendientes están señaladas explícitamente y
> esperan una segunda ronda de `ANNOTATION:` si el resultado no es satisfactorio.

---

## Restricciones transversales (aplican a TODAS las fases)

Estas reglas vienen del `README.md` y condicionan cada tarea de la lista de abajo:

- **TDD obligatorio** — red → green → refactor. Antes de cualquier código de producción debe existir un test que falle. Aplica a modelos, controladores, vistas, jobs y flujos de sistema. *Implicación:* cada tarea de implementación lleva implícitamente una sub-tarea de tests por delante (no después).
- **RuboCop sin warnings + Brakeman sin alertas nuevas** antes de cualquier commit/merge. *Implicación:* incluir `bin/rubocop` y `bin/brakeman` en el flujo local; idealmente como paso de CI.
- **i18n para todo texto visible** — nada de strings hardcodeadas en vistas, controladores, mailers ni flashes. Todas las claves deben existir en cada locale soportado.

### i18n — alcance decidido

**Locales soportados desde el día 1:** `en`, `es`, `ca` (Opción C).

Implica además, fluyendo desde la decisión:

- **Selector de idioma en la UI** — accesible desde cualquier pantalla (probablemente en el menú/perfil), persistente por usuario logueado y por sesión para visitantes.
- **`Note#language`** — cada nota se etiqueta con el idioma en el que fue escrita (autodetectado por el locale activo del autor en el momento de creación, editable). Migración añade `language:string` con índice.
- **`User#preferred_languages`** — array de idiomas en los que el usuario quiere ver notas (filtro aplicable en la query de `nearby`). Por defecto = `[locale_actual]`.
- **Traducción automática** — fuera del MVP, pero el modelo se diseña pensando en ello: cuando se conecte una API de traducción (DeepL, Google, OpenAI), se añadirá `translated_content` en caché por destino, sin tocar `content` original.

> **Trabajo de traducción del MVP:** mantener paridad de claves entre `en.yml`, `es.yml`, `ca.yml`. El texto fuente se escribe en inglés (`en`) y de ahí se traduce. Cualquier PR con clave nueva debe incluir las tres traducciones.

---

## Decisiones cerradas

| Tema | Decisión |
|---|---|
| **Autenticación** | Auth nativo de Rails 8 (`bin/rails generate authentication`). Sin Devise. |
| **CSS / UI** | Tailwind (`tailwindcss-rails`) + DaisyUI para componentes. |
| **Mapa** | Leaflet 1.9 + tiles OpenStreetMap (sin API key). |
| **Jobs** | SolidQueue (default Rails 8) + RecurringJob para purga de expiradas. |

### Pregunta abierta resuelta — Base de datos

> *Anotación original:* "SQLite no es un strong requirement. ¿Qué alternativas tenemos? ¿Para la demo es más fácil mantener SQLite con pocos datos?"

**Recomendación: mantener SQLite para el MVP.**

Razones y alternativas evaluadas:

- **SQLite (elegido)** — cero setup, Rails 8 lo trata como production-grade, suficiente para el volumen de la demo (decenas de notas, decenas de usuarios). La query de `nearby` con bounding box + Haversine va sobrada con tan pocas filas.
- **PostgreSQL + PostGIS** — la opción técnicamente correcta para geo: `ST_DWithin` indexado, mucho más rápido y limpio. *Coste:* setup local (Docker o instalación), migrar `database.yml`, gem `activerecord-postgis-adapter`. **Decisión:** no para la demo, pero se documenta como migración natural si el proyecto sobrevive al hackathon.
- **MySQL** — sin ventaja relevante para este caso de uso.

**Plan de salida:** si en algún momento durante la implementación notamos que las queries de `nearby` se sienten lentas con datos seed más densos, evaluamos saltar a Postgres + PostGIS. Mantener `database.yml` lo suficientemente limpio para que el cambio sea de pocas horas.

### Pregunta abierta resuelta — ¿Notas eternas?

> *Anotación original:* "¿tiene sentido poder crear notas eternas? Por ahora se podría plantear tenerlo."

**Recomendación: NO permitir notas verdaderamente eternas. Sí inputs flexibles con un hard cap alto.**

Razones:

- La **ephemeralidad es el diferencial** del producto. Una nota eterna rompe el pitch ("notas que desaparecen"). Si dejamos crear notas para siempre, parte del público las usará así y el producto se diluye en "Twitter geolocalizado".
- **Riesgo operativo:** las notas eternas se acumulan, ensucian el mapa, traen problemas de moderación (ver `future.md`).

**Propuesta concreta:**

- **TTL:** input numérico con unidad (minutos / horas / días). Mínimo `1 minuto`, máximo `30 días` *desde la UI*. Sugerencias rápidas como botones (15min / 1h / 1día / 1 semana) pero el usuario puede escribir cualquier valor dentro del rango.
- **`max_views`:** input numérico libre. Mínimo `1`, máximo `1000` *desde la UI*. Sugerencias rápidas (1 / 5 / 25 / 100).
- Una nota expira por **lo que se cumpla primero**: tiempo o vistas.

### Notas permanentes — soporte a nivel de modelo (UI oculta en MVP)

El modelo `Note` admite notas sin expiración. La UI del MVP **no las expone**, pero el substrato queda preparado para activarlas más adelante (admin, tipo `Landmark`, casos especiales).

**Convención: `nil` mejor que `0`.**

- `expires_at IS NULL` ⇒ la nota no expira por tiempo.
- `max_views IS NULL` ⇒ la nota no expira por visualizaciones.
- Si ambos son `nil`, la nota es permanente.

Razones para preferir `nil` sobre `0`:

- **Semántica clara:** `nil` = "sin restricción"; `0` significaría "expira de inmediato" / "0 vistas permitidas" — exactamente lo contrario.
- **Convención Rails/SQL:** una columna nullable representa naturalmente la ausencia de límite. No hay que recordar "el cero es mágico".
- **Queries más simples y a prueba de errores:**
  - Scope `active`: `where("expires_at IS NULL OR expires_at > ?", Time.current).where("max_views IS NULL OR views_count < max_views")`.
  - Vs con `0`: `where("expires_at = 0 OR expires_at > ?", ...)` mezcla tipos (datetime con sentinela), feo y propenso a bugs.
- **Validaciones más limpias:** `max_views`, si presente, `> 0`. Si quisiéramos `0` como "infinito" tendríamos que excluirlo de "mínimo 1" y agregar caso especial — exactamente la complejidad que evita TDD-friendly.

**Implicaciones concretas para la Fase 1:**

- Las columnas `expires_at` y `max_views` son **nullable** en la migración.
- Validaciones del modelo: si presentes, `expires_at > created_at` y `max_views >= 1`. **Sin** cap superior duro a nivel de modelo (`30 días` y `1000 vistas` son límites de UI/controlador, no del modelo). Esto deja la puerta abierta a notas permanentes sin tocar el modelo.
- El form de creación del MVP siempre envía valores no nulos dentro de los caps de UI; el path "permanente" entra solo por seed, console o futuro panel admin.
- El `view!` solo incrementa y "mata" la nota si `max_views` está presente.
- Tests deben cubrir explícitamente el caso permanente: `Note.create!(expires_at: nil, max_views: nil, ...)` permanece en el scope `active` indefinidamente.

> Esto **no sustituye** el futuro modelo `Landmark` planteado en `future.md`: `Landmark` será un tipo de contenido editorial (POI, info histórica) con UI propia. Las notas permanentes vía `nil/nil` son el sustrato técnico que permite ambos caminos sin migración adicional.

---

## Lista de tareas

### Fase 0 — Fundamentos
1. Añadir Tailwind (`tailwindcss-rails`) + DaisyUI
2. Layout base mobile-first: viewport meta, navegación inferior estilo app, paleta limpia
3. Selector de idioma global (en/es/ca) y switcher en UI
4. Esqueleto de `config/locales/{en,es,ca}.yml`
5. Generar autenticación Rails 8 (`User`: email, password, `preferred_languages`)
6. Páginas de signup / login / logout estilizadas e i18n-ed
7. CI básico (GitHub Actions) ejecutando `bin/rails test`, `bin/rubocop`, `bin/brakeman`

### Fase 1 — Modelo de datos
8. Migración + modelo `Note`. Columnas: `content:text`, `latitude:decimal`, `longitude:decimal`, `expires_at:datetime` **(nullable)**, `max_views:integer` **(nullable)**, `views_count:integer default: 0`, `user:references`, `visibility:integer` enum, `language:string` con índice. Índice compuesto `(latitude, longitude)` para acelerar bounding box.
9. Validaciones: presence de `content`/coords/user, rangos lat/lng, `content.length` 1..500, `expires_at > created_at` *si presente*, `max_views >= 1` *si presente*. **Sin** cap superior a nivel de modelo (los caps de 30 días / 1000 vistas son de UI/controlador).
10. Scope `active` que considera `nil` como "sin límite": `where("expires_at IS NULL OR expires_at > ?", Time.current).where("max_views IS NULL OR views_count < max_views")`. *TODO en el código: revaluar cuando el RecurringJob purgue expiradas; podría volverse redundante para las que tienen TTL.*
11. Método `view!` que incrementa `views_count` atómicamente. Devuelve si la nota sigue viva. Si `max_views` es `nil`, nunca muere por views.
12. Tests de modelo: validaciones, scope `active`, `view!`, expiración por tiempo, expiración por views, **caso permanente (`expires_at: nil, max_views: nil`) que permanece activo indefinidamente**.

### Fase 2 — Captura de geolocalización + creación de notas
13. Stimulus controller `geolocation_controller.js` que rellena lat/lng en un form
14. `NotesController#new` + `#create` con form mobile-first
15. UX: pedir permiso de ubicación con feedback claro si se deniega (i18n)
16. Inputs flexibles para TTL (numérico + unidad, sugerencias rápidas) y `max_views` (numérico libre + sugerencias) con los caps decididos
17. Auto-asignar `Note#language` desde `I18n.locale` actual; permitir override
18. Tests de controlador (creación válida, validaciones, rango de TTL/views, asignación de idioma)

### Fase 3 — Descubrir notas cercanas
19. `NotesController#nearby` con params `lat`, `lng`, `radius`
20. Query: bounding box + Haversine, scope `active`, filtrado por `User#preferred_languages`, ordenar por distancia. **Hard cap del radio:** ≤ 5 km en MVP (param que el cliente no puede superar).
21. Vista listado mobile-first (cards con distancia, tiempo restante, vistas restantes, idioma)
22. Tests del query: nota expirada, fuera de radio, idioma fuera de preferencias, radio sobre el cap

### Fase 4 — Mapa interactivo
23. Importar Leaflet vía importmap o como asset
24. Stimulus controller `map_controller.js` que centra en la ubicación del usuario
25. Renderizar markers de notas activas; popup con preview
26. Botón "ver" que abre el detalle (consume una visualización)
27. Marker especial para "tú estás aquí"

### Fase 5 — Visualización y expiración
28. `NotesController#show` que llama a `note.view!` y renderiza
29. Si `view!` deja la nota muerta → mostrar contenido pero marcar "this note has just vanished" (i18n)
30. RecurringJob (SolidQueue) cada minuto que purga `Note.where("expires_at < ? OR views_count >= max_views", Time.current)`
31. Tests del job + tests de expiración por tiempo y por views

### Fase 6 — Pulido UI/UX
32. **Prototipado con Claude Design** — generar mockups de las pantallas clave (mapa, listado, creación, detalle, login) y traducirlos a componentes Tailwind/DaisyUI antes de escribir HTML manual. *Decisión:* sí, lo usamos como pre-step de esta fase.
33. Empty states bonitos ("No ghosts nearby — drop the first one") en los 3 idiomas
34. Animaciones suaves al desaparecer una nota (fade)
35. Iconos coherentes (Heroicons)
36. Loading states (al pedir geolocation, al guardar, al cargar mapa)
37. Mensajes de error amables (permiso denegado, sin GPS, etc.) i18n
38. PWA: icono, manifest, "add to home screen", offline básico

---

## Fuera del MVP

Todo el contenido de la **Fase 7 (amigos, reacciones, imagen, OAuth)**, el **admin panel**, los **puntos de interés**, el **sistema de moderación** y el **despliegue robusto** se trasladan a [`doc/future.md`](future.md), que mantenemos vivo como backlog post-hackathon.
