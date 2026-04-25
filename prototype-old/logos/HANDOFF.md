# Logo handoff for Claude Code

This folder contains three favicon kits — **ghost-pin**, **ink-pin**, **monogram-g** — and a recommended horizontal lockup pattern. Pick one kit, then implement the integration described below.

## Step 1 · pick a kit

Open `preview.html` in a browser. Each kit shows:
- The favicon SVG at 16/32/48 px
- The app icon at 180/192/512 px
- The horizontal lockup as it should render in the app header

When you've decided, copy the chosen folder's contents into the Rails app:

```
logos/favicon-kits/<KIT>/favicon.svg          → public/favicon.svg
logos/favicon-kits/<KIT>/favicon-16.png       → public/favicon-16.png
logos/favicon-kits/<KIT>/favicon-32.png       → public/favicon-32.png
logos/favicon-kits/<KIT>/apple-touch-icon.png → public/apple-touch-icon.png
logos/favicon-kits/<KIT>/icon-192.png         → public/icons/icon-192.png
logos/favicon-kits/<KIT>/icon-512.png         → public/icons/icon-512.png
```

The mark SVG for the **header lockup** (the bigger one with the accent dot) is in `logos/svg/`:
- `01-ghost-pin.svg` → if you picked ghost-pin
- `02-ink-pin.svg` → if you picked ink-pin
- `05-monogram.svg` → if you picked monogram-g

Copy that file to `app/assets/images/logo/mark.svg`.

## Step 2 · `<head>` block

In `app/views/layouts/application.html.erb`:

```erb
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#f5efe4">
```

## Step 3 · PWA manifest

Create `public/manifest.webmanifest`:

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
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Note: SVG is intentionally not in the manifest — Android Chrome rejects it. Browsers handle the SVG favicon via the `<link>` tag instead.

## Step 4 · header lockup partial

Create `app/views/shared/_logo.html.erb`:

```erb
<%# Reusable wordmark + mark. Pass `size:` (default :md) and `link:` (default true). %>
<% size = local_assigns.fetch(:size, :md) %>
<% link = local_assigns.fetch(:link, true) %>
<% mark_px = { sm: 18, md: 24, lg: 36 }[size] %>
<% text_px = { sm: 14, md: 19, lg: 28 }[size] %>

<%= (link ? link_to(root_path, class: "logo") : tag.span(class: "logo")) do %>
  <%= image_tag "logo/mark.svg", class: "logo__mark", width: mark_px, height: mark_px, alt: "" %>
  <span class="logo__word" style="font-size: <%= text_px %>px;">geo<i>whisper</i></span>
<% end %>
```

Tailwind / DaisyUI styles (drop in your global stylesheet):

```css
.logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}
.logo__word {
  font-family: 'Newsreader', Georgia, serif;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #2a2118;
  line-height: 1;
}
.logo__word i {
  font-style: italic;
  color: #b6552c;
}
```

Use it in your layout's header:
```erb
<header class="navbar bg-base-100 border-b border-base-200">
  <div class="flex-1">
    <%= render "shared/logo", size: :md %>
  </div>
  <%# rest of nav %>
</header>
```

## Step 5 · load the font

Add to `<head>` (before the stylesheets):

```erb
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
```

(Or self-host with `bin/importmap pin` / vendoring — your call.)

## Visual reference — three lockup styles

All three render the wordmark with live HTML/CSS text. Only the mark differs.

```
[ghost-pin glyph]  geowhisper      ← italic 'whisper' in #b6552c
[ink-pin glyph]    geowhisper
[g. tile glyph]    geowhisper
```

The `<i>whisper</i>` italic + terracotta color is the constant. Don't change it across pages.

## Notes

- SVG favicons work in all modern browsers; the PNG fallbacks are for older mail clients and crawlers.
- Don't render the wordmark as an image. Live text scales, kerns, and translates.
- The mark and wordmark should always sit on the same baseline — `align-items: center` on `.logo` handles this with the SVGs as designed.
- Dark mode: if you ship one later, swap `.logo__word` color to `#f5efe4` and use the mark from `logos/svg/01-ghost-pin-dark.svg` (or the equivalent for whichever kit you chose).
