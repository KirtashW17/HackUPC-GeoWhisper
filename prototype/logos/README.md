# GeoWhisper · logo SVGs

Eight standalone marks + two dark variants. Each file is a single inline `<svg>` you can paste straight into a Rails partial, an `app/assets/images/` reference, or a favicon `<link>`.

| File | Direction |
|---|---|
| `01-ghost-pin.svg` | Ghost-pin (recommended primary) |
| `01-ghost-pin-dark.svg` | Ghost-pin · paper-on-ink for dark surfaces |
| `02-ink-pin.svg` | Ink-pin |
| `03-folded-note.svg` | Folded note |
| `04-hush-waves.svg` | Hush waves |
| `05-monogram.svg` | Monogram g. (recommended secondary — same as auth-screen badge) |
| `05-monogram-dark.svg` | Monogram · dark |
| `06-open-quote.svg` | Open quote |
| `07-lat-grid.svg` | Lat-grid sigil |
| `08-ghost-speck.svg` | Ghost speck (great as favicon) |

## Tokens used

- Ink: `#2a2118`
- Paper: `#f5efe4`
- Accent (terracotta): `#b6552c`
- Card edge: `rgba(60,40,20,0.12)`
- Dark surface: `#22201c`

## Notes

- All marks are designed on an 80×80 grid with safe area inside 8px. They scale fine to 16px (favicon) and 1024px (App Store).
- The wordmark is **not** included as SVG — it's set in Newsreader 500 with the second word italic in terracotta. Render it with live text whenever possible so the kerning stays right and i18n stays cheap.
- The monogram uses live text too. If you need a flat-text version (e.g. for OG images), open it in a vector editor and convert the `<text>` to a path.
