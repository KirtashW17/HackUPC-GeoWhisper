# GeoWhisper · Cluster handoff

Three files, in order of usefulness for code:

## 1. `GeoWhisper-prototype.html` — the prototype
Single self-contained file. Open in any browser, no server needed.
The cluster section is at the top of the canvas: **Map · pin clustering**.

5 frames:
- Cluster vocabulary (visual atlas: 1 / 2 / 3 / 7 / 12 / 120 notes)
- Map · pins + clusters mixed (the realistic case)
- Cluster tapped · 3 notes (bottom sheet open, small list)
- Cluster tapped · 12 notes (bottom sheet, scrolling)
- Edge · same GPS point (5 notes at exactly the same coords)

## 2. `cluster-components.jsx` — the source for the cluster UI
Plain JSX, ~330 lines. Components:

- **`ClusterMark`** — the stacked-papers visual. Props: `count`, `size` (`sm`/`md`/`lg`), `active`. Always renders 3 layers + the count, regardless of how many notes there are.
- **`ClusterSheet`** — the bottom sheet that lists notes when a cluster is tapped. Props: `notes`, `place`.
- **`ClusterRow`** — single row inside the sheet (note text + lang chip + reads-left + fade timer).
- Frame-level wrappers (`ClusterAtlas`, `MapWithClusters`, `ClusterExpanded`, `SameSpotStack`) — useful as references but not meant for direct reuse.

Theme tokens (`t.card`, `t.cardEdge`, `t.bgDeep`, etc.) come from `themes.js` in the original project — substitute your own.

## 3. `icons.jsx` — full icon set
All icons used across the prototype, including the new `target` (recenter crosshair). Each is an inline SVG component: `<Icon.target c="#3a3128" s={16} />`.

## Behaviour rules (the important part)

1. **Cluster threshold**: pins within ~40px screen-distance fuse into a stack.
2. **Tap, don't zoom**: tapping a stack opens the bottom sheet. Zoom does *not* split same-coord stacks — and that's intentional, because in GeoWhisper many notes at exactly the same GPS point is the *normal* case, not the exception.
3. **Always 3 layers visible**: never render more sheets in the stack — only the count changes (`3`, `9+`, `99+`).
4. **Bottom sheet**, not popover. Drag handle at top, place name + count header, scrollable list of `ClusterRow`s.
5. **Active cluster stays visible** behind the dimmed map while the sheet is open, slightly scaled up.

## Fonts used
- Newsreader (serif body)
- Inter (UI)
- JetBrains Mono (caps/labels)
- Caveat (handwritten accents — not used in clusters)
