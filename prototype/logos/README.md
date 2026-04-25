# GeoWhisper · logos

## Layout

```
logos/
├── svg/               ← the eight mark explorations + dark variants
├── lockup/            ← horizontal lockup (mark + wordmark) — light & dark, SVG + PNG
├── app-icon/          ← square icons for stores + PWA, SVG + PNG @ 192/512/1024
└── favicon/           ← favicon.svg + 16/32 PNG + apple-touch-icon
```

## What to use where

| Surface | File |
|---|---|
| Web `<link rel="icon">` | `favicon/favicon.svg` (+ `favicon-32.png` fallback) |
| iOS home screen | `favicon/apple-touch-icon.png` (180×180) |
| PWA manifest 192/512 | `app-icon/icon-192.png`, `icon-512.png` |
| PWA maskable | `app-icon/maskable-512.png` (purpose: `"maskable"`) |
| App Store / Play Store | `app-icon/icon-1024.png` |
| Email signatures, OG, slide decks | `lockup/horizontal-light.png` |
| Header in app | render the wordmark with **HTML + Newsreader** next to `svg/01-ghost-pin.svg` — don't use the lockup PNG inline |

## Wordmark — render with live text, not as an asset

The wordmark is just Newsreader 500 with the second word italic in `#b6552c`. Rendering it with HTML keeps it crisp at any size, kernable, and easy to translate. A small Rails partial:

```erb
<span class="logo">
  <%= image_tag "logo/ghost-pin.svg", class: "logo__mark" %>
  <span class="logo__word">geo<i>whisper</i></span>
</span>
```

```css
.logo { display: inline-flex; align-items: center; gap: 10px; }
.logo__word { font-family: 'Newsreader', Georgia, serif; font-weight: 500; letter-spacing: -0.02em; color: #2a2118; }
.logo__word i { font-style: italic; color: #b6552c; }
```

A flattened PNG of the lockup is in `lockup/` for places that won't load Newsreader (OG images, email, slide decks, App Store screenshots).

## Browser support — short answers

- **SVG favicon:** yes, all modern browsers (Chrome, Edge, Firefox, Safari 14+) accept `<link rel="icon" type="image/svg+xml">`. Ship a 32×32 PNG fallback for older mail clients.
- **Android PWA manifest:** SVG **not allowed**. PWA manifests require PNG icons. Use the 192/512 PNGs above. Add a separate maskable entry for proper home-screen integration on Android 8+.

## Snippets

### `<head>` block

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#f5efe4">
```

### `manifest.webmanifest`

```json
{
  "name": "GeoWhisper",
  "short_name": "GeoWhisper",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f5efe4",
  "theme_color": "#f5efe4",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

## Tokens

- Ink: `#2a2118` · Paper: `#f5efe4` · Accent: `#b6552c`
- Card edge: `rgba(60,40,20,0.12)` · Dark surface: `#22201c`
