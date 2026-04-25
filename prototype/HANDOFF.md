# GeoWhisper · Prototype handoff

These mockups live alongside the Rails project as visual reference. **Do not import the JSX into the Rails app** — recreate the screens with Tailwind + DaisyUI components, using the tokens below as ground truth.

Open `index.html` in any browser. The canvas pans/zooms; click any artboard to focus it. Phones are partially clickable (bottom tabs, peek card → detail) so you can tap through the flow.

---

## Design tokens (Soft & Paper)

Lift these into your `tailwind.config.js` `theme.extend` block.

### Color

| Token         | Hex         | Use |
|---------------|-------------|-----|
| `bg`          | `#f5efe4`   | Page background (paper) |
| `bg-deep`     | `#ede5d4`   | Inset surfaces, chip backgrounds, separators |
| `card`        | `#fffaf0`   | Note cards, list rows, inputs |
| `card-edge`   | `rgba(60, 40, 20, 0.08)` | Hairline borders on cards |
| `ink`         | `#2a2118`   | Primary text |
| `ink-soft`    | `rgba(42,33,24,0.62)` | Secondary text, metadata |
| `ink-faint`   | `rgba(42,33,24,0.32)` | Tertiary, dividers, disabled glyphs |
| `accent`      | `#b6552c`   | Terracotta — CTAs, links, "live" markers |
| `accent-soft` | `#e8c8a8`   | Tape, highlight tints |
| `ghost`       | `#7a8b7a`   | "You are here" pin, ambient ghost glyphs, faded ink |

### Type

Three families, loaded from Google Fonts:

- **Newsreader** (serif, 400/500/600 + italic) — headings, body of notes, settings labels.
- **Inter** (sans, 400/500/600/700) — buttons, tab labels, system UI, form values.
- **JetBrains Mono** (mono, 400/500) — eyebrows, metadata chips, tiny uppercase labels (`letter-spacing: 1.2–1.5`).
- **Caveat** (handwriting) — used very sparingly: signed notes ("— a regular"), the closing line "be quiet, be here.". One weight, one place per screen, never for primary content.

Type scale used:
| Use | Size / line-height | Family / weight |
|-----|--------------------|-----------------|
| Hero (onboarding) | 44 / 46 | serif 500 |
| Screen title | 28 / 32 | serif 500 |
| Section title | 24 / 28 | serif 500 |
| Note body | 17 / 23 | serif 400 |
| Body | 15 / 22 | serif 400 |
| Eyebrow / chip | 10–11 / — | mono 600, uppercase, letter-spacing 1.2–1.5 |
| Tab label | 10 / — | sans 400/600 |

### Radius / spacing / shadow

- Card radius: **14–16px** (notes 14, big sheets 16, hero card 18).
- Button radius: **12–14px**.
- Pill/chip radius: **999px** (full).
- Icon button: 38–42px square, radius 12 or full circle.
- Card shadow: `0 12px 30px -16px rgba(0,0,0,0.2)` for normal, `0 30px 60px -30px rgba(0,0,0,0.35)` for the hero detail card.

### Iconography

Hairline 1.4–1.6px stroke, no fills except dot accents. The set used in the mockups is in `icons.jsx` — Heroicons "outline" family is the closest off-the-shelf match. Stick to one weight project-wide.

---

## Patterns

### "SOON" affordance
Disabled-but-visible features use a small mono badge: `SOON` in `bg-deep` background, `ink-soft` text, 9px, letter-spacing 0.6, font-weight 600. Wrapper opacity 0.55, `cursor: not-allowed`. Used on Friends/One-person visibility, Google OAuth, "Show whispers in" filter, "Notify me", "Anonymous mode".

### Three-tab nav
Bottom nav has exactly three slots: **Map**, **Drop** (centered FAB, terracotta, 52px circle, raised −22px), **Me**. The Map↔List toggle is a segmented control inside the map's top header — not a tab.

### Note card anatomy
1. Optional corner crease (top-right triangle in `bg-deep`).
2. Body in serif, 17/23. Hand-written variant uses Caveat 22/26 — only for notes whose author opted into a "scribble" style (visual only).
3. Footer row: distance · time-left · views, in mono 11, with 2px dot separators. Language chip pinned right.

### Lifecycle bars (detail screen)
Two stacked progress bars labeled `FADES IN` and `READS LEFT`. Bar height 4px, radius 2, fill `accent`, track `bg-deep`. Right-aligned value in serif 14 600 + faint subtext.

### Empty / denied / loading
- **Empty:** ghost glyph, serif headline, italic subline, **trilingual preview row** in mono so the i18n contract is visible.
- **Denied:** numbered steps card explaining how to enable location, primary "Try again" CTA, secondary "browse a sample of public whispers" link (greyed).

---

## Screen inventory & route mapping (suggested)

| Frame | Likely Rails route | Notes |
|-------|--------------------|-------|
| 01 Onboarding | `/welcome` (or splash before signup) | Triggers browser geolocation prompt. |
| 02 Sign in | `/session/new` | Rails 8 native auth. Google button stays disabled. |
| 03 Sign up | `/users/new` | Includes `preferred_languages` chip selector. |
| 04 Map (home) | `/` (when authed + located) | Stimulus `geolocation_controller` + Leaflet. |
| 05 Nearby list | `/notes` (or same page, `?view=list`) | Same data as map; toggle is client-side. |
| 06 Drop | `/notes/new` | Form locks lat/lng to GPS; visibility hidden in MVP, sent as `:public`. |
| 07 Detail | `/notes/:id` | `note.view!` increments on render. Vanish = soft fade only. |
| 08 Yourself | `/profile` | Includes interface locale picker (the only enabled language control in MVP). |
| 09 Empty | inline state of 04 | Ghost glyph + EN/ES/CA preview. |
| 10 Denied | inline state of 04 | Detect via Stimulus when `navigator.geolocation` is denied. |

---

## What to *not* port

- The stylized SVG map (`map.jsx`) — replace with **Leaflet + OSM tiles**, then nudge styling with CSS filters if needed. The mockup map is a static representation; the production app should use real tiles per `task_planning.md`.
- The iOS device frame (`ios-frame.jsx`) — purely a presentation chrome.
- `design-canvas.jsx` — only used to lay artboards out side-by-side.

---

## Open decisions still in design

- The actual vanish animation. MVP = simple fade. Revisit post-hackathon if there's appetite.
- The "whisper back" reply flow (button exists on Detail, target screen not designed).
- The interface locale picker UI (settings row exists, picker not designed).

---

## File layout in this prototype folder

```
prototype/
├── index.html              ← open this
├── HANDOFF.md              ← you are here
├── themes.js               ← single source of truth for color/font tokens
├── icons.jsx               ← hairline icon set
├── atoms.jsx               ← WhisperCard, TabBar, ScreenHeader
├── map.jsx                 ← stylized map placeholder (do not port)
├── screens-1.jsx           ← onboarding, map, nearby list, empty, denied
├── screens-2.jsx           ← compose, auth (login/signup)
├── screens-3.jsx           ← detail (with fade-out), profile/settings
├── app.jsx                 ← canvas layout
├── design-canvas.jsx       ← presentation harness
└── ios-frame.jsx           ← device frame
```
