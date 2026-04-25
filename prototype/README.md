# GeoWhisper · Prototype build

Self-contained interactive prototype of the GeoWhisper app. Twelve frames in total — the eight core flow screens, two edge states (empty / GPS denied), and two form-validation states (signup / login errors with inline field errors).

## Run it

You need any static-file server, because the prototype uses ES module-style script loading and Babel transpilation that browsers block under `file://`.

### Option A — npx (no install)

```bash
cd prototype-build
npx serve
```

Then open http://localhost:3000.

### Option B — Python

```bash
cd prototype-build
python3 -m http.server 8000
```

Then open http://localhost:8000.

### Option C — drop into your Rails app

Copy this whole folder into `public/prototype/` in your Rails repo. Rails serves `public/` as static, so:

```bash
bin/rails server
```

Then open http://localhost:3000/prototype/.

## What's in the canvas

| Section | Frames |
|---|---|
| Soft & Paper · core flow | 01 Onboarding · 02 Sign in · 03 Sign up · 04 Map (home) · 05 Nearby list · 06 Drop a whisper · 07 Read · ink-bleed vanish · 08 Yourself |
| Edge states | 09 Empty · no ghosts here yet · 10 Location denied |
| Form validation · inline per-field errors | Sign up · multi-field error · Sign in · server-returned error |
| Tap-through demo | One live phone — tap the peek card on the map to trigger the read → vanish flow |

## How to interact

- **Pan the canvas** with click-drag. Scroll to zoom.
- **Click any artboard label** to focus it fullscreen. Press Esc to exit.
- The bottom tab bar in any phone is clickable: Map · Drop · Me.
- The peek card on the map is clickable — tap it to enter the detail view and watch the ink-bleed vanish play through.

## Files

```
prototype-build/
├── index.html              ← entry point
├── app.jsx                 ← canvas layout & phone scaffolding
├── design-canvas.jsx       ← presentation harness (pan/zoom/focus)
├── ios-frame.jsx           ← device chrome
├── icons.jsx               ← hairline icon set
├── atoms.jsx               ← shared components (WhisperCard, TabBar, ScreenHeader)
├── map.jsx                 ← stylized map placeholder
├── screens-1.jsx           ← onboarding, map, nearby list, empty, denied
├── screens-2.jsx           ← compose, auth (login + signup, with error state)
├── screens-3.jsx           ← detail (with ink-bleed vanish), profile/settings
└── themes.js               ← Soft & Paper tokens
```

## Design tokens

Embedded in `themes.js`. Reach for these when porting to Tailwind/DaisyUI:

- Paper: `#f5efe4` · Paper-deep: `#ede5d4`
- Card: `#fffaf0` · Card edge: `rgba(60,40,20,0.08)`
- Ink: `#2a2118` · Ink-soft: `rgba(42,33,24,0.62)` · Ink-faint: `rgba(42,33,24,0.32)`
- Accent (terracotta): `#b6552c` · Accent-soft: `#e8c8a8`
- Ghost: `#7a8b7a`
- Error: `#c0432b` (used for inline form errors)
- Type: Newsreader (serif), Inter (sans), JetBrains Mono (mono), Caveat (handwriting, sparingly)

## Notes for the production build

This prototype is a visual reference. **Do not import the JSX into the Rails app.** Recreate the screens with Tailwind/DaisyUI components, using:

- The tokens above as ground truth
- The `HANDOFF.md` next to the logos for the favicon + lockup integration
- The form-error pattern shown in the validation frames (red 1.5px border + soft halo, helper text below in sans-12, role="alert", aria-invalid, error clears as user types)
