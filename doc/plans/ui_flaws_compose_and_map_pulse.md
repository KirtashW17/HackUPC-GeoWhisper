# UI flaws — compose form fidelity + map pin pulse

Cierra los puntos abiertos en `doc/ui-flaws.md`. Ground truth: `prototype/screens-2.jsx`
(`ComposeScreen`) para el formulario y el patrón existente
`gw-pin-here__pulse` (en `application.tailwind.css` + `map_controller.js`)
para los pines del mapa.

## Objetivos

1. Acercar `app/views/notes/new.html.erb` al prototipo:
   - Cabecera con botón "atrás" (izquierda) + chip de ubicación (derecha).
   - Sombra suave en cada *card* (textarea, TTL, max views, visibilidad).
   - Selector de **max views** como `range` (1–100) con lectura en vivo, en
     vez de radios.
   - Selector de **visibility** con tres botones icono+label (Anyone here /
     Friends / One person); los dos últimos deshabilitados con badge SOON.
   - Eliminar la barra inferior (`shared/tab_bar`) de esta pantalla.
2. Pines de notas en el mapa con animación de pulso, reutilizando el
   keyframe `gw-pulse-here` (o uno hermano más sutil) para que respiren
   igual que el "you are here".

## Cambios concretos

### Compose form
- `app/views/notes/new.html.erb`
  - Quitar `pb-24` del wrapper y quitar `render "shared/tab_bar"`.
  - Reemplazar el bloque "cancel + eyebrow + headline" por:
    - Cabecera con botón redondo (← icono) que enlaza a `map_path`, y a la
      derecha un chip con icono pin + texto de ubicación. Texto de
      ubicación: por ahora i18n estático (`compose.location.placeholder`,
      ej. *"Locked to your spot"*); coordenadas resueltas a nombre de calle
      es trabajo futuro — lo dejamos como TODO con clave i18n.
    - Debajo: eyebrow + headline (igual que ahora).
  - Añadir `shadow-card` (o `shadow-[0_12px_30px_-16px_rgba(0,0,0,0.2)]`
    expresado como utilidad/clase) a cada card. Si Tailwind ya tiene
    `shadow-card` (revisar `tailwind.config.js`), reutilizar; si no, añadir
    el token.
  - **Max views**: sustituir el grupo de radios por:
    - `f.range_field :max_views, in: 1..100, step: 1` con `data-controller="range-readout"` y `data-action="input->range-readout#refresh"`.
    - Lectura en vivo (`<span data-range-readout-target="readout">`) que
      muestra `t("compose.fields.max_views.readout", count: N)`.
    - Marcas mínimas (1 / 5 / 25 / 100) como `font-mono text-[9px]`.
    - Nuevo Stimulus controller `app/javascript/controllers/range_readout_controller.js`.
  - **Visibility**: tres `<button>` (no radios visuales — usar input radio
    `sr-only` + label clickable como ya hacemos para TTL, pero con icono
    encima del texto). Iconos inline SVG: globe, user, feather. Friends y
    One person quedan `disabled` con badge SOON, igual que ahora.
- `app/assets/stylesheets/application.tailwind.css`
  - Si añadimos clase utilitaria nueva para la sombra de card, declararla
    en `@layer components` (`.gw-card-shadow` o similar) para no usar el
    arbitrary value en cada sitio.
  - Estilizar el `input[type=range]` (track + thumb) con tokens del
    proyecto. **No** `style="..."` en la vista (regla del repo).

### Map pin pulse
- `app/assets/stylesheets/application.tailwind.css`
  - Añadir `.gw-pin__pulse` (mismo patrón que `.gw-pin-here__pulse` pero
    con `bg-accent/35` y `animation: gw-pulse-here 2.4s ease-out infinite`
    o un keyframe hermano más lento si queremos diferenciarlo del usuario).
- `app/javascript/controllers/map_controller.js`
  - En `renderMarkers`, añadir el `<span class="gw-pin__pulse">` antes del
    `gw-pin__dot` y aumentar `iconSize` a `[22, 22]` con
    `iconAnchor: [11, 11]` para que el halo no se recorte.

### i18n (en/es/ca)
Nuevas claves bajo `compose.*`:
- `compose.location.placeholder`
- `compose.back`
- `compose.fields.max_views.readout` (con `count`)
- `compose.fields.visibility.options.{public,friends,one}.label` si se
  reorganiza; si no, reutilizar las existentes.
Mantener paridad estricta entre los tres locales.

## Tests (TDD primero)
- `test/controllers/notes_controller_test.rb` (extender `#new` test):
  - `assert_select "nav[data-tab-bar]", false` — la barra ya no aparece en
    `/notes/new`. (Ajustar selector al que use el partial actual.)
  - `assert_select "input[type=range][name='compose_form[max_views]']"` — el campo es slider.
  - `assert_select "a[href=?]", map_path` para el botón atrás.
  - `assert_select "[data-compose-location]"` para el chip de ubicación.
  - `assert_select "button[disabled]", text: /SOON/i, count: 2` para
    Friends + One person (o equivalente sin texto SOON dependiendo de la
    estructura final).
- Nuevo: `test/javascript` no existe en el proyecto, así que el Stimulus
  controller no se cubre con unit test JS. En su lugar, integration test
  asserta presencia de `data-controller="range-readout"` y del target.
- Map pulse: igual que el "you are here" actual, no hay test de CSS/JS;
  documentamos en el commit que se añade el span de pulso en
  `renderMarkers`. Si queremos red de seguridad, un test mínimo en JSDOM
  vía un nuevo runner queda fuera de alcance.

## Rubocop / Brakeman
Pasar `bin/rubocop` y `bin/brakeman` antes de declarar hecho.

## Open questions
1. ¿La ubicación del chip superior debe mostrar coordenadas crudas
   ("41.39, 2.16") como fallback hasta tener reverse geocoding, o nos
   conformamos con un literal i18n tipo *"Locked to your spot"*? Mi
   propuesta: literal i18n + TODO; el reverse geocoding es trabajo aparte.
2. ¿El pulso de los pines debe ser idéntico al del usuario o más sutil
   (más lento, menor opacidad) para no competir visualmente? Propongo más
   sutil.
3. Quitar la tab bar en `/notes/new` ¿también implica quitarla de
   `/notes/:id`? El prototipo no la muestra ahí tampoco — fuera de alcance
   de este plan, lo añadiría a `doc/ui-flaws.md` como punto separado.
