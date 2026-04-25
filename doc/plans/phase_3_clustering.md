# Plan — Fase 3 · Clustering de pins en el mapa

> Añadir clustering visual a `/map` siguiendo el nuevo prototipo
> (`prototype/cluster-components.jsx` + `prototype/README.md`). Cuando varias
> notas caen a < ~40 px de distancia en pantalla se fusionan en un *stack* de
> papelitos; al tocarlo se abre un bottom sheet con la lista de notas. Caso
> especial: solapación con el pin **"You are here"**.
>
> **Branch sugerida:** `phase-3/clustering`.
> **Pre-requisito:** Fase 2 ya integrada (`Note.nearby` + `/notes/nearby`
> JSON ya devolviendo el payload completo de cada nota).
>
> **Estado:** plan acordado tras anotaciones. Listo para implementar.

---

## 1. Objetivo

Que el mapa siga siendo legible cuando hay muchos whispers cerca:
1. Un único *mark* por sitio (sea single pin o stack).
2. Los stacks abren un bottom sheet con la lista; los singles siguen
   navegando a `/notes/:id` (comportamiento actual).
3. El zoom **no** separa stacks que comparten la misma GPS exacta —es la
   regla 5 del prototipo.
4. Resolver el solapamiento con el pin del propio usuario.

---

## 2. Reglas duras del prototipo (no negociables)

Copiadas de `prototype/README.md` para tenerlas a mano:

| # | Regla |
|---|---|
| 1 | Threshold de fusión: **~40 px** en pantalla (depende del zoom). |
| 2 | Tap abre el sheet; el zoom no separa mismas coords. |
| 3 | Stack siempre con **3 hojas visibles** + contador (`3`, `9+`, `99+`). |
| 4 | **Bottom sheet**, no popover. Drag handle, header con eyebrow + lugar, lista scrollable. |
| 5 | Cluster activo permanece visible y escalado tras el sheet (mapa atenuado). |

---

## 3. Caso especial: solapamiento con el pin "You are here"

El pin `gw-pin-here` es semánticamente distinto: marca al usuario, no es
una nota, no se puede "abrir". Si una o varias notas caen dentro del
threshold de 40 px del pin del usuario tenemos un conflicto visual real
(la nota recién publicada cae **exactamente** sobre las coords del usuario,
es el caso más común).

### Decisión: mark dual con badge esquinero

El pin `here` mantiene su pulso y dot. Cuando hay N notas dentro del
threshold le adosamos un **badge en la esquina superior-derecha** (tipo
notificación iOS) con el contador (`N`, `9+`, `99+`), círculo del color
`accent` con borde `bg` para despegarlo del pulso.

- Tap en el badge → abre el sheet con eyebrow *"Right where you stand"*
  (clave i18n nueva).
- El dot central sigue siendo no clickable (`keyboard: false`,
  `pointer-events: none` salvo el badge).
- Las notas agrupadas con `here` **no** se renderizan como pins
  independientes: el badge es el único mark.
- Si sólo hay 1 nota en el here-cluster, igual mostramos el badge con `1`
  (más predecible que cambiar de UI según el count, y resuelve el caso
  típico de "acabo de soltar una nota").

Descartadas:

- *Fusionar `here` dentro del cluster como mark mixto:* mezcla dos
  identidades visuales y pierde el "yo estoy aquí" cuando el sheet está
  cerrado.
- *Spider-leg / dispersión radial:* engaña sobre la posición real y choca
  con la regla "el zoom no separa mismas coords".

---

## 4. Algoritmo de clustering (cliente)

### Entrada
- Array `this.notes` (ya viene ordenado por distancia desde
  `/notes/nearby`).
- Posición del usuario `(userLat, userLng)` y proyección Leaflet a
  coordenadas de pantalla (`leaflet.latLngToContainerPoint`).
- Zoom actual.

### Pasos
1. Proyectar cada nota a píxeles (`(px, py)`).
2. Marcar como **"here-cluster"** las notas con `distance(pixel, herePixel)
   < 40`. Estas no entran en el clustering normal.
3. Greedy O(n²) sobre las restantes:
   - Iterar por orden de distancia ascendente.
   - Para cada nota no asignada, abrir un nuevo grupo *anclado en sus
     coords* y absorber a todas las no-asignadas a < 40 px del ancla.
   - El ancla del grupo es la primera nota (la más cercana al usuario),
     no el centroide. Razón: estable bajo zoom — el ancla no se mueve si
     entra/sale otra nota del grupo.
4. Renderizar:
   - Grupos de tamaño 1 → `gw-pin` actual (single).
   - Grupos de tamaño ≥ 2 → `gw-pin-cluster` (stack de 3 hojas + contador).
   - Si hay notas en el "here-cluster" → badge sobre `gw-pin-here` con el
     contador.

### Recálculo
- En `zoomend` y `moveend` de Leaflet (`this.leaflet.on(...)`).
- También al recibir un nuevo payload de `/notes/nearby` (poll futuro o
  refresh manual).

### Coste
n ≤ ~200 (radio máximo 5 km, hackathon-scale). O(n²) = 40 000 ops, dos
veces por interacción → trivial. Cuando crezca → optimización registrada
en `doc/future.md` § *Clustering del mapa* (grid hashing propio,
`leaflet.markercluster`, Supercluster).

---

## 5. Bottom sheet

### Estructura (en JS, construido como `cardHTML` actual)

```
┌─────────────────────────────────┐
│           ─── (drag)            │
│                                 │
│  N WHISPERS HERE   (eyebrow)    │
│  Cafè del Born     (serif H1)   │ ← ver §5.1
│                                 │
│  ┌─────────────────────────┐    │
│  │ ClusterRow (note 1)     │ ↕  │
│  │ ClusterRow (note 2)     │    │
│  │ ClusterRow (note N)     │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

`ClusterRow` reutiliza el card actual de la lista (`cardHTML` con
`distance`, `lang`, `time`, `views`) — no inventamos un row nuevo, solo
quitamos el `closest` highlight. El tap en una row navega a
`/notes/:id?lat=…&lng=…`, igual que en la lista.

### 5.1 Header del sheet

Sin toponimia (no hay reverse geocoding en MVP — registrado en
`doc/future.md` § *Clustering del mapa*).

Estructura:

```
N WHISPERS HERE  · 12 M AWAY      ← eyebrow mono, accent + inkSoft
```

Una sola línea (eyebrow) en lugar de eyebrow + título serif: más limpio
y evita el efecto "sucio" de meter una distancia bajo un título vacío.
La distancia se omite cuando es `0 m` o cuando el cluster es el
here-cluster (en ese caso el eyebrow es `RIGHT WHERE YOU STAND`, sin
distancia).

### 5.2 Interacción con el "peek" actual

Cuando el sheet está abierto, ocultar el peek (`this.peekTarget.hidden =
true`). Al cerrar, restaurar.

### 5.3 Cierre

- Tap fuera del sheet (en el overlay atenuado).
- Tap en pill *CLOSE STACK*.
- Tecla `Escape`.

### 5.4 ¿Sheet también para el "here-cluster"?

Sí, mismo componente. Eyebrow distinto: `Right where you stand` (key
i18n nueva, traducir a ca/es).

---

## 6. Estilos (CSS)

Añadir a `app/assets/stylesheets/application.tailwind.css`:

- `.gw-pin-cluster` con 3 capas via pseudo-elementos o spans, rotaciones
  y offsets como en el prototipo (`tilts = [-7, 4, -2]`,
  `offsets = [(-3,3),(3,1),(0,-2)]`). Corner-fold en la hoja superior.
- `.gw-pin-cluster--lg` para count ≥ 10 (size 52).
- `.gw-pin-here__badge` para el contador esquinero del here-cluster.
- `.gw-cluster-sheet`, `.gw-cluster-sheet__row`, overlay atenuado
  `.gw-map-dim`.
- Animación slide-up del sheet (`transform: translateY(100%) → 0`,
  ~220 ms).

Sin `style="..."` inline (regla del proyecto). Tokens via
`tailwind.config.js` ya definidos (`bg`, `card`, `cardEdge`, `accent`,
`ink`, `inkSoft`, `inkFaint`, `bgDeep`).

---

## 7. Cambios por archivo

- `app/javascript/controllers/map_controller.js`
  - Nueva fase `renderClusters()` reemplaza `renderMarkers()`.
  - Listeners `zoomend` / `moveend`.
  - Estado interno: `this.clusters`, `this.hereClusterCount`,
    `this.openCluster` (id o null).
  - Nuevos métodos: `openClusterSheet(cluster)`, `closeClusterSheet()`,
    `renderHereBadge()`, `clusterize(notes)`.
- `app/views/map/show.html.erb`
  - Nuevo `data-map-target="sheet"` (contenedor del bottom sheet, oculto
    por defecto) y `data-map-target="overlay"` (dimming).
- `app/assets/stylesheets/application.tailwind.css` — ver §6.
- `config/locales/{en,es,ca}.yml` — claves nuevas:
  - `map.cluster.eyebrow.one`, `.other` ("1 whisper here" / "N whispers
    here").
  - `map.cluster.here_eyebrow` ("Right where you stand").
  - `map.cluster.distance_away` ("%{m} m away").
  - `map.cluster.close` ("Close stack").
- `prototype/` — sin cambios; ya es la fuente de verdad.

---

## 8. Tests

Sin Capybara (regla de proyecto). Sin runner JS — aplazado a
`doc/future.md` cuando aparezca el segundo módulo JS no trivial.

Cobertura:

- **Modelo / controller:** sin cambios; el clustering es 100 % cliente.
  `Note.nearby` y `NotesController#nearby` no se tocan, no se reescribe
  ningún test del backend.
- **Integración Rails:** un nuevo test en
  `test/controllers/map_controller_test.rb` que verifique los nuevos
  data-targets (`sheet`, `overlay`) y que las claves i18n nuevas
  aparecen en el HTML renderizado (eyebrow, here-eyebrow, close pill).
  No cubre la lógica del clusterer en sí, pero garantiza el contrato
  HTML que el JS espera.
- **Smoke test manual** (a cargo del usuario): paso 7 de §10.

---

## 9. Decisiones cerradas

| # | Tema | Decisión |
|---|---|---|
| 1 | `here` con notas solapadas | Mark dual: pulso de `gw-pin-here` + badge esquinero con contador (§3). |
| 2 | Header del sheet | Sólo eyebrow `N WHISPERS HERE · 12 M AWAY`, sin título serif. Reverse geocoding → `future.md` (§5.1). |
| 3 | JS testing | Aplazado. Cobertura por test de integración Rails sobre el HTML (§8). |
| 4 | Animaciones | Slide-up del sheet (~220 ms `ease-out`) + fade del overlay (~180 ms). Sin animación al cerrar más allá del inverso. |
| 5 | Threshold | Constante en JS `CLUSTER_THRESHOLD_PX = 40`. No configurable. |
| 6 | Peek vs cluster | Si la nota más cercana cae dentro de un cluster (incluido el here-cluster), el peek pasa a mostrar `N whispers · 12 m` con el mismo styling que la card actual; el tap abre el sheet en lugar de navegar a `/notes/:id`. Si la más cercana es single, el peek se mantiene exactamente como hoy. |
| 7 | Here-cluster con count = 1 | Mostrar igual el badge con `1`. Comportamiento predecible y resuelve el caso típico "acabo de soltar una nota". |
| 8 | Distancia en eyebrow del here-cluster | Omitir (sería siempre ~0 m). Eyebrow: `RIGHT WHERE YOU STAND`. |

---

## 10. Pasos de implementación (cuando esté el plan acordado)

1. CSS y marcado del sheet/overlay (sin lógica) — verificable en HTML
   estático.
2. Extraer `clusterize` a módulo puro y testear (si optamos por el
   runner JS).
3. Integrar `renderClusters` en `map_controller.js`.
4. Solapación con `here` (§3, opción elegida).
5. Bottom sheet: open/close, scroll, navegación al tap de row.
6. i18n + parity test.
7. Smoke test manual a cargo del usuario (multi-zoom, mismas coords,
   notas a 0 m, notas en límite del radio).
8. Brakeman + RuboCop + suite verde.
9. Actualizar `doc/architecture.md` (capa de clustering en cliente) y
   `doc/task_planning.md` (Fase 3 marcada). Dejar este plan congelado.
