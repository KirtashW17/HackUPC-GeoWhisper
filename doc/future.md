# GeoWhisper — Backlog post-MVP (`future.md`)

> Ideas explícitamente fuera del alcance del MVP del hackathon, conservadas
> para que no se pierdan. No se trabajan ahora pero el modelo y el código del
> MVP se diseñan para no cerrar la puerta a ellas.

---

## Social y relaciones

- **`Friendship`** — sistema de solicitudes y aceptación.
- **Visibilidad `:friends`** en `Note` — filtrar `nearby` por amigos del autor.
- **Visibilidad de destinatario único** — una nota dirigida a un amigo concreto, invisible para el resto incluso si pasan por encima.
- **Login social** — Google / Apple vía `omniauth`.

## Contenido enriquecido

- **Notas con imagen** — vía Active Storage. Implica decidir compresión y límites.
- **Notas con audio** ("whispers") — short audio clips, encajan con el nombre del producto.
- **Reacciones efímeras** — emojis sobre una nota, expiran con ella. A evaluar también permitir un texto corto opcional junto al emoji (mini-respuesta), pendiente de decidir alcance vs. un modelo de replies completo.

## Internacionalización avanzada

- **Traducción automática** de notas — integración con DeepL / Google Translate / OpenAI. Cachear `translated_content` por idioma destino.
- **Detección automática de idioma** del contenido al crear una nota (en lugar de heredar el locale del autor).

## Puntos de interés (POIs)

- **Concepto:** lugares físicos preregistrados (cafés, plazas, monumentos) con metadata.
- **Posibilidades:**
  - Anclar notas a un POI en lugar de a coordenadas crudas → la nota "vive" en el lugar aunque la persona se mueva ligeramente.
  - Recomendaciones del tipo "hay 3 ghosts esperando en este café".
  - Modelo `Landmark` o `PointOfInterest` con `name`, `category`, `coords`, foto.
- **Fuente de datos:** importar desde OSM (Overpass API) un subset por ciudad para la demo.

## Notas "permanentes" (revisión del concepto)

Si tras el MVP queremos experimentar con notas que no expiren, hacerlo como un **tipo distinto** (no extender `Note`):

- `Landmark` o `PinnedNote`: contenido editorial fijo asociado a un lugar (info histórica, descripción del POI, etc.).
- Mantiene la ephemeralidad como diferencial de `Note`, sin caer en la trampa de "Twitter geolocalizado".

## Moderación

Crítico antes de cualquier release público real.

- **Reportar nota** — botón en el detalle, motivo (spam / contenido ofensivo / información personal / ...).
- **Filtros automáticos**:
  - Lista de palabras prohibidas configurable.
  - Detección de PII (teléfonos, emails, direcciones) con regex / NER.
  - Moderación de contenido vía API (OpenAI moderation, Perspective, AWS Comprehend).
- **Umbral de auto-ocultación** — si una nota supera N reportes, se oculta automáticamente pendiente de revisión humana.
- **Estado de la nota:** `published` / `flagged` / `hidden` / `removed`.
- **Bloqueo de usuario** — si un usuario reporta a otro, ya no se ven sus notas mutuamente.

## Operativo / infra

- **Admin panel** — *prioridad alta post-MVP*: ver/editar/borrar notas, gestionar reportes, banear usuarios, métricas básicas (notas creadas/día, retención).
- **Migración a PostgreSQL + PostGIS** — *para escalar la búsqueda geo*. SQLite va sobrado para la demo (decenas de notas), pero `WHERE lat BETWEEN x AND y AND ...` con cientos/miles de notas y radios variables empieza a notarse. Postgres con la extensión PostGIS permite:
  - Tipo de columna `GEOGRAPHY(Point, 4326)` con índice **GiST** sobre coordenadas reales (no bounding box manual).
  - `ST_DWithin(coord, point, radius)` — filtrado por distancia indexado, en una sola condición, exacto en metros sobre el geoide.
  - `ST_Distance` para ordenar por cercanía sin Haversine a mano.
  - Soporte natural para futuras consultas más complejas (POIs, friend-of-friend dentro de un área, agregaciones por celda).
  *Coste de migración:* `database.yml` a Postgres, `gem activerecord-postgis-adapter`, una migración que convierte `lat`/`lng decimal` en `coord geography`, y reescribir el scope `nearby` para usar `ST_DWithin`. Estimado: 2–3 horas si se hace antes de tener volumen real. Documentado como "plan de salida" en [`decisions.md`](decisions.md).
- **Despliegue robusto** — Kamal o Fly.io con HTTPS automático (la geolocalización lo exige fuera de localhost).
- **Métricas y observabilidad** — Skylight / NewRelic gratuito; al menos logs estructurados.
- **Rate limiting** — `rack-attack` para creación de notas y endpoints públicos.

## API y extensibilidad

- **API JSON pública** — para una eventual app nativa o integraciones de terceros.
- **Webhooks** — notificar a sistemas externos cuando una nota cumple condición (ej. tour interactivo).

## i18n extra

- **Más idiomas** — añadir `fr`, `de`, `it`, ... según comunidad.
- **Idioma detectado del navegador** como default antes de que el usuario configure.

## Refactor: presenter para la presentación de `Note`

- **Estado actual:** `Note` mezcla persistencia y presentación — expone `time_left_seconds`, `views_remaining`, `as_json_payload`, `distance_to_m` y un `attr_accessor :distance_m` que es estado no persistido. Pragmático para hackathon (mantiene una superficie estable para `NotesController` y los views), feo a futuro.
- **Plan:** extraer a un presenter / serializer dedicado. Opciones evaluables:
  - `Notes::NearbyResult = Data.define(:note, :distance_m)` con métodos delegados — preserva inmutabilidad del AR record.
  - Serializer estilo Jbuilder (`app/views/notes/_note.json.jbuilder`) para el payload JSON, dejando solo presentación HTML en el modelo.
  - Alba o ActiveModel::Serializer si el proyecto crece a múltiples consumidores.
- **Cuándo:** cuando el modelo `Note` empiece a tener varios consumidores con shapes distintos (API móvil, webhooks, admin) o cuando llegue el primer test de regresión por mezclar concerns.

## Mapa: refresh y descubrimiento ambiente

- **Refresh periódico del nearby** — hoy el mapa solo carga notas al `connect` del Stimulus controller. Para una experiencia "ambient" (notas que aparecen mientras paseas) se necesita re-fetch periódico:
  - Polling sencillo cada 30–60 s mientras la pestaña está visible (`visibilitychange` para pausar en background).
  - O Turbo Streams con un canal por usuario que empuja notas nuevas en su radio.
  - Cuidado con el rate-limiting de OSM tiles si los markers fuerzan re-render del mapa entero.
- **Indicador de "alguien acaba de dejar una"** — animación discreta cuando llega una nota nueva en el radio del usuario.
- **Radio de búsqueda configurable por el usuario** — hoy el radio está hardcoded en el wrapper de `/map` (`data-map-radius-value="5000"`, capado a 5 km en el server). El usuario no puede ajustarlo. *Nice-to-have:* exponer un slider o segmented control en el header del mapa (`100 m / 500 m / 1 km / 5 km`) que actualice el `radiusValue` del Stimulus controller y dispare un re-fetch. Persistir la última elección por usuario (`User#preferred_radius_m`) para que se recuerde entre sesiones. Considerar también vincularlo automáticamente al zoom de Leaflet en lugar de manual.

---

## Cómo se mantiene este documento

- Cada entrada nueva va con una línea de contexto (de dónde viene la idea, qué desbloquearía).
- Cuando algo de aquí entra al sprint activo, se mueve a `task_planning.md` y se borra de aquí.
- No hay prioridades formales — son ideas. Las prioridades se acuerdan al planear el siguiente sprint.
