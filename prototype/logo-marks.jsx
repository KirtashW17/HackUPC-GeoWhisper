// Shared logo marks for GeoWhisper.
// Subset of logos.jsx — exposes the marks + Wordmark + LogoCard so they can
// be imported into the main canvas (index.html) without re-defining App.

const LOGO_PAPER = '#f5efe4';
const LOGO_INK = '#2a2118';
const LOGO_ACCENT = '#b6552c';
const LOGO_SERIF = "'Newsreader', Georgia, serif";
const LOGO_MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";

function MarkGhostPin({ size = 80, ink = LOGO_INK, accent = LOGO_ACCENT, paper = LOGO_PAPER }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-label="GeoWhisper">
      <path
        d="M40 6 C 24 6, 12 18, 12 33 C 12 46, 24 56, 28 64 L 28 70 Q 30 73, 32 70 L 32 67 Q 34 71, 36 67 L 36 70 Q 38 73, 40 70 L 40 67 Q 42 71, 44 67 L 44 70 Q 46 73, 48 70 L 48 64 C 56 56, 68 46, 68 33 C 68 18, 56 6, 40 6 Z"
        fill={ink}
      />
      <circle cx="33" cy="30" r="2.4" fill={paper} />
      <circle cx="47" cy="30" r="2.4" fill={paper} />
      <circle cx="40" cy="76" r="2.2" fill={accent} />
    </svg>
  );
}

function MarkInkPin({ size = 80, ink = LOGO_INK, accent = LOGO_ACCENT, paper = LOGO_PAPER }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-label="GeoWhisper">
      <path
        d="M40 8 C 22 8, 10 22, 10 36 C 10 52, 30 64, 40 74 C 50 64, 70 52, 70 36 C 70 22, 58 8, 40 8 Z"
        fill="none" stroke={ink} strokeWidth="3.2" strokeLinejoin="round"
      />
      <ellipse cx="40" cy="36" rx="9" ry="10" fill={accent} />
      <circle cx="36.5" cy="32.5" r="2.2" fill={paper} opacity="0.55" />
    </svg>
  );
}

function MarkFoldedNote({ size = 80, ink = LOGO_INK, accent = LOGO_ACCENT, paper = LOGO_PAPER }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-label="GeoWhisper">
      <path d="M16 14 L 56 14 L 64 22 L 64 60 L 16 60 Z" fill={paper} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M56 14 L 56 22 L 64 22" fill="none" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 32 Q 32 30, 40 32 T 56 32" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M24 42 Q 30 40, 38 42 T 50 42" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      <circle cx="40" cy="70" r="3.4" fill={accent} />
    </svg>
  );
}

function MarkMonogram({ size = 80, ink = LOGO_INK, accent = LOGO_ACCENT, bg = LOGO_PAPER, edge = 'rgba(60,40,20,0.12)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-label="GeoWhisper">
      <rect x="2" y="2" width="76" height="76" rx="14" fill={bg} stroke={edge} strokeWidth="1.4" />
      <text x="40" y="55" textAnchor="middle"
        fontFamily={LOGO_SERIF} fontStyle="italic" fontWeight="500"
        fontSize="44" fill={ink}>g</text>
      <circle cx="56" cy="54" r="3.2" fill={accent} />
    </svg>
  );
}

function MarkGhostSpeck({ size = 80, ink = LOGO_INK, accent = LOGO_ACCENT, paper = LOGO_PAPER }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-label="GeoWhisper">
      <path
        d="M18 38 C 18 24, 28 14, 40 14 C 52 14, 62 24, 62 38 L 62 56 Q 58 62, 54 56 Q 50 62, 46 56 Q 42 62, 38 56 Q 34 62, 30 56 Q 26 62, 22 56 Q 18 62, 18 56 Z"
        fill={ink}
      />
      <circle cx="32" cy="36" r="3" fill={paper} />
      <circle cx="48" cy="36" r="3" fill={paper} />
      <circle cx="40" cy="70" r="2.2" fill={accent} />
    </svg>
  );
}

function LogoWordmark({ size = 28, ink = LOGO_INK, accent = LOGO_ACCENT, italic = true }) {
  return (
    <span style={{
      fontFamily: LOGO_SERIF, fontSize: size, color: ink,
      fontWeight: 500, letterSpacing: -0.6,
      lineHeight: 1, whiteSpace: 'nowrap',
    }}>
      geo<span style={{ fontStyle: italic ? 'italic' : 'normal', color: accent }}>whisper</span>
    </span>
  );
}

window.MarkGhostPin = MarkGhostPin;
window.MarkInkPin = MarkInkPin;
window.MarkFoldedNote = MarkFoldedNote;
window.MarkMonogram = MarkMonogram;
window.MarkGhostSpeck = MarkGhostSpeck;
window.LogoWordmark = LogoWordmark;
window.LOGO_TOKENS = {
  paper: LOGO_PAPER, ink: LOGO_INK, accent: LOGO_ACCENT,
  serif: LOGO_SERIF, mono: LOGO_MONO,
};
