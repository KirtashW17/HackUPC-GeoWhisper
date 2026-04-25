# GeoWhisper · Prototype

Static design prototype for GeoWhisper. Pure HTML + JSX (loaded via Babel-in-the-browser) — no build step. Use it as visual reference while implementing the Rails app; **do not import the JSX into the Rails app** (see [`HANDOFF.md`](HANDOFF.md)).

## Run it

The prototype is a static site. Serve it from this folder with any static server. The fastest:

```bash
npx serve prototype
```

…from the project root (or `npx serve .` from inside `prototype/`).

`npx` will download `serve` on the fly the first time, then start it on `http://localhost:3000` (or the next free port if 3000 is taken — read the actual URL from the terminal). Open that URL in any modern browser.

Alternative one-liners if `npx` is not available:

```bash
python3 -m http.server 3000        # Python ≥ 3
ruby -run -e httpd . -p 3000       # Ruby
php -S localhost:3000              # PHP
```

## Once it's running

- Open `index.html` (the URL above already points to it).
- The canvas pans and zooms; click any artboard to focus on it.
- Phones are partially clickable: bottom tabs work, the peek card opens the detail screen.

## What's where

| File | Purpose |
|---|---|
| `index.html` | Entry point — loads everything else. Open this. |
| `HANDOFF.md` | Design tokens, screen → route mapping, what to port and what not to. **Read this before recreating screens in Rails.** |
| `themes.js` | Single source of truth for colors and font tokens. |
| `screens-1.jsx` | Onboarding, map, nearby list, empty, denied. |
| `screens-2.jsx` | Compose, login, signup. |
| `screens-3.jsx` | Detail (with fade-out), profile/settings. |
| `atoms.jsx` | `WhisperCard`, `TabBar`, `ScreenHeader`. |
| `icons.jsx` | Hairline icon set. |
| `map.jsx` | Stylized SVG map placeholder — **not to port**, replace with Leaflet + OSM. |
| `app.jsx`, `design-canvas.jsx`, `ios-frame.jsx` | Presentation chrome — not part of the product. |

## Notes

- The prototype runs Babel in the browser via a `<script>` CDN, so first paint is a bit slow. That's fine for design review; do not adopt this approach in the Rails app.
- All assets are local — no API keys, no backend, no network calls beyond the Babel CDN and Google Fonts.
- If you change anything, just refresh the browser. There is no watcher.
