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
- **Reacciones efímeras** — emojis sobre una nota, expiran con ella.

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
- **Despliegue robusto** — Kamal o Fly.io con HTTPS automático (la geolocalización lo exige fuera de localhost).
- **Métricas y observabilidad** — Skylight / NewRelic gratuito; al menos logs estructurados.
- **Rate limiting** — `rack-attack` para creación de notas y endpoints públicos.

## API y extensibilidad

- **API JSON pública** — para una eventual app nativa o integraciones de terceros.
- **Webhooks** — notificar a sistemas externos cuando una nota cumple condición (ej. tour interactivo).

## i18n extra

- **Más idiomas** — añadir `fr`, `de`, `it`, ... según comunidad.
- **Idioma detectado del navegador** como default antes de que el usuario configure.

---

## Cómo se mantiene este documento

- Cada entrada nueva va con una línea de contexto (de dónde viene la idea, qué desbloquearía).
- Cuando algo de aquí entra al sprint activo, se mueve a `task_planning.md` y se borra de aquí.
- No hay prioridades formales — son ideas. Las prioridades se acuerdan al planear el siguiente sprint.
