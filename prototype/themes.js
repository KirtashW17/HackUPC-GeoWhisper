// Two design directions for GeoWhisper.
// Both share the same screen set + interactions; only tokens change.

const PAPER = {
  key: 'paper',
  name: 'Soft & Paper',
  tagline: 'Warm, intimate, low-stakes — like leaving a love note',
  // Surfaces
  bg: '#f5efe4',          // warm off-white paper
  bgDeep: '#ede5d4',
  card: '#fffaf0',
  cardEdge: 'rgba(60, 40, 20, 0.08)',
  ink: '#2a2118',         // warm near-black
  inkSoft: 'rgba(42, 33, 24, 0.62)',
  inkFaint: 'rgba(42, 33, 24, 0.32)',
  // Accents
  accent: '#b6552c',       // terracotta ink
  accentSoft: '#e8c8a8',
  ghost: '#7a8b7a',        // sage / faded ink
  // Map
  mapBg: '#ede5d4',
  mapStroke: 'rgba(80,60,40,0.18)',
  mapStrokeSoft: 'rgba(80,60,40,0.08)',
  mapWater: '#dcd0b8',
  mapPark: '#d6dcc4',
  // Type
  serif: '"Newsreader", "Iowan Old Style", Georgia, serif',
  sans: '"Inter", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  hand: '"Caveat", "Bradley Hand", cursive',
  // Phone chrome
  deviceBg: '#f5efe4',
  statusDark: false,
};

const TWILIGHT = {
  key: 'twilight',
  name: 'Twilight',
  tagline: 'Paper at dusk — moodier, atmospheric, demo-ready',
  bg: '#1a1d2b',
  bgDeep: '#13151f',
  card: '#262a3d',
  cardEdge: 'rgba(255,255,255,0.06)',
  ink: '#f3eee0',
  inkSoft: 'rgba(243, 238, 224, 0.62)',
  inkFaint: 'rgba(243, 238, 224, 0.32)',
  accent: '#e9b67a',        // warm candle glow
  accentSoft: 'rgba(233, 182, 122, 0.18)',
  ghost: '#9aa6c4',         // pale moonlight
  mapBg: '#13151f',
  mapStroke: 'rgba(180, 200, 240, 0.14)',
  mapStrokeSoft: 'rgba(180, 200, 240, 0.06)',
  mapWater: '#0d1019',
  mapPark: '#1d2230',
  serif: '"Newsreader", "Iowan Old Style", Georgia, serif',
  sans: '"Inter", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  hand: '"Caveat", "Bradley Hand", cursive',
  deviceBg: '#1a1d2b',
  statusDark: true,
};

window.PAPER = PAPER;
window.TWILIGHT = TWILIGHT;
