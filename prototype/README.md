# GeoWhisper · Handoff package

A self-contained snapshot of the prototype + the assets and source code your devs need to ship the latest changes.

```
handoff/
├── GeoWhisper-prototype.html   ← the full clickable prototype, single file
├── README.md                   ← you are here
├── cluster-components.jsx      ← cluster pin UI source
├── profile-with-signout.jsx    ← profile screen with sign-out button
├── logo-marks.jsx              ← logo SVG components (React)
├── icons.jsx                   ← full icon set
└── logos/                      ← finished logo assets (SVG + PNG kits)
    ├── README.md               ← which file goes where (favicons, app icons, lockups)
    ├── svg/                    ← 8 mark explorations + dark variants
    ├── lockup/                 ← horizontal lockup, light & dark, SVG + PNG
    ├── app-icon/               ← PWA / store icons @ 192/512/1024
    ├── favicon/                ← favicon.svg + 16/32 PNG + apple-touch-icon
    └── favicon-kits/           ← preview + HANDOFF.md for the wordmark partial
```

---

## 1. The prototype

**`GeoWhisper-prototype.html`** — single self-contained file. Open it in any browser, no server, no build step. Everything inlined: components, fonts, assets.

What's new since the last handoff:
- **Brand · logo system** — leading section. Primary lockup (Ghost-pin · M-01), scale stress test, light/dark surface check, the four secondary marks, and favicon previews at 64/32/16.
- **Map · pin clustering** — five frames showing the stacked-papers pattern + bottom sheet expansion (covered in detail below).
- **Profile · sign-out** — terracotta `Sign out` button at the bottom of the profile screen, separated from the settings groups, with version + handle below.

---

## 2. Cluster patterns — `cluster-components.jsx`

Plain JSX, ~330 lines. Five frames in the prototype's **Map · pin clustering** section.

### Components

- **`ClusterMark`** — the stacked-papers visual. Props: `count`, `size` (`sm`/`md`/`lg`), `active`. Always renders 3 layers + the count, regardless of how many notes there are.
- **`ClusterSheet`** — the bottom sheet that lists notes when a cluster is tapped. Props: `notes`, `place`.
- **`ClusterRow`** — single row inside the sheet (note text + lang chip + reads-left + fade timer).
- Frame-level wrappers (`ClusterAtlas`, `MapWithClusters`, `ClusterExpanded`, `SameSpotStack`) — references, not for direct reuse.

Theme tokens (`t.card`, `t.cardEdge`, `t.bgDeep`…) come from `themes.js` in the prototype project — substitute your own.

### Behaviour rules — the important part

1. **Cluster threshold**: pins within ~40px screen-distance fuse into a stack.
2. **Tap, don't zoom**: tapping a stack opens the bottom sheet. Zoom does *not* split same-coord stacks — and that's intentional, because in GeoWhisper many notes at exactly the same GPS point is the *normal* case, not the exception.
3. **Always 3 layers visible**: never render more sheets in the stack — only the count changes (`3`, `9+`, `99+`).
4. **Bottom sheet**, not popover. Drag handle, place name + count header, scrollable list of `ClusterRow`s.
5. **Active cluster stays visible** behind the dimmed map while the sheet is open, slightly scaled up.

---

## 3. Profile with sign-out — `profile-with-signout.jsx`

Same file as the prototype's `screens-3.jsx`. The new bit is at the bottom of `SettingsScreen`:

```jsx
<button style={{
  width: '100%', padding: '14px 16px', borderRadius: 14,
  background: t.card, border: `1px solid ${t.cardEdge}`,
  color: t.accent,                /* terracotta, not destructive red */
  fontFamily: t.sans, fontSize: 15, fontWeight: 500,
  ...
}}>
  <Icon.back c={t.accent} s={14} /> Sign out
</button>
```

**Why terracotta and not red:** signing out of GeoWhisper doesn't destroy anything — the user's notes stay alive on the map. Red would over-warn.

Below the button, a small mono caption shows `v 0.1 · MARINA@GEOWHISPER` — handy for support and for users with multiple accounts.

---

## 4. Logos

### `logos/` — the finished asset kits

See `logos/README.md` for the full mapping (which file goes where). Quick summary:

| Surface | File |
|---|---|
| Web favicon | `favicon/favicon.svg` (+ `favicon-32.png` fallback) |
| iOS home screen | `favicon/apple-touch-icon.png` (180×180) |
| PWA manifest 192/512 | `app-icon/icon-192.png`, `icon-512.png` |
| PWA maskable | `app-icon/maskable-512.png` (purpose: `"maskable"`) |
| App Store / Play Store | `app-icon/icon-1024.png` |
| Email / OG / decks | `lockup/horizontal-light.png` |

### Wordmark — render with live HTML, never as an image

The wordmark is just Newsreader 500 with the second word italic in `#b6552c`. Rails partial:

```erb
<span class="logo">
  <%= image_tag "logo/ghost-pin.svg", class: "logo__mark" %>
  <span class="logo__word">geo<i>whisper</i></span>
</span>
```

```css
.logo { display: inline-flex; align-items: center; gap: 10px; }
.logo__word {
  font-family: 'Newsreader', Georgia, serif;
  font-weight: 500; letter-spacing: -0.02em; color: #2a2118;
}
.logo__word i { font-style: italic; color: #b6552c; }
```

A flattened PNG of the lockup is in `lockup/` for places that won't load Newsreader (OG images, email, slide decks, App Store screenshots).

### `logo-marks.jsx` — React versions of the marks

If your stack is React/Next instead of (or alongside) Rails, you can drop these in directly: `MarkGhostPin`, `MarkInkPin`, `MarkFoldedNote`, `MarkMonogram`, `MarkGhostSpeck`, plus `LogoWordmark` and a `LOGO_TOKENS` object with the colors and font stacks.

---

## 5. Icons — `icons.jsx`

Full icon set, all inline SVG. Includes the new `target` (recenter crosshair) used in the cluster-map frame. Usage:

```jsx
<Icon.target c="#3a3128" s={16} />
```

Each icon takes `c` (color, default `currentColor`) and `s` (size in px).

---

## 6. Tokens

- Ink: `#2a2118` · Paper: `#f5efe4` · Accent: `#b6552c`
- Card edge: `rgba(60,40,20,0.12)` · Dark surface: `#22201c`

Fonts:
- **Newsreader** (serif body)
- **Inter** (UI sans)
- **JetBrains Mono** (caps / labels)
- **Caveat** (handwritten accents)
